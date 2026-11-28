import { useEffect, useMemo, useRef, useState } from 'react';
import { useSquadStore, NAME_MAX, cleanName, sanitize } from './squadStore';
import { MATCH_DAY_HASH, MATCH_DAY_PATH } from './route';
import { supabase } from './db';
import { Confirm, Modal, ModalHead, NextIcon, Num, Toast, TrashIcon } from './ui';
import { calendarParts, daysAway, dayWord, formatTime, formatWhen, nextDays, useFlash, useToday, whenTime } from './utils';
import { MatchView } from './MatchView';
import './squad.css';

const readMatchId = () => {
  const prefix = `#/${MATCH_DAY_PATH}/`;
  const h = window.location.hash;
  if (!h.startsWith(prefix)) return null;
  const id = h.slice(prefix.length);
  return /^[A-Za-z0-9_-]{1,40}$/.test(id) ? id : null;
};

const useMatchRoute = () => {
  const [id, setId] = useState(readMatchId);
  useEffect(() => {
    const on = () => setId(readMatchId());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return id;
};

export default function TeamsPage() {
  const [session, setSession] = useState(undefined); // undefined = checking

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next ?? null));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  if (session === undefined) return <div className="state-card"><div className="spinner" /></div>;
  if (!session) return <Login />;
  // Keyed by user so a different sign-in starts from a clean store.
  return <Workspace key={session.user.id} email={session.user.email} />;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      // Same message for a wrong email or a wrong password, so neither can be probed.
      setError(err.status === 429 ? 'Too many attempts. Wait a minute and try again.'
        : err.status === 400 ? 'Wrong email or password.'
          : 'Could not sign in. Check your internet connection.');
      setPassword('');
    }
  };

  return (
    <div className="sq-page page-enter sq-login-wrap">
      <form className="card sq-login" onSubmit={submit}>
        <div className="card-content">
          <div className="modal-icon">🔒</div>
          <h1 className="modal-title">Admin sign in</h1>
          <p className="modal-desc">Match day is for the admin only.</p>
          <div className="modal-body">
            <label className="field">
              <span className="field-label">Email</span>
              <input className="input input-lg" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} required />
            </label>
            <label className="field">
              <span className="field-label">Password</span>
              <input className="input input-lg" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} maxLength={200} required />
            </label>
            {error && <p className="hosting-error" role="alert">{error}</p>}
          </div>
          <button type="submit" className="btn btn-primary btn-md btn-block" disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Workspace({ email }) {
  const { state, act, status, saving, syncError, retry, localOffer, acceptLocal, declineLocal } = useSquadStore();
  const matchId = useMatchRoute();
  const match = matchId && state.matches.find(m => m.id === matchId);

  if (status === 'loading') return <div className="state-card"><div className="spinner" /><small>Loading your squad…</small></div>;
  if (status === 'error') {
    return (
      <div className="state-card error">
        <span>Could not load from the database.</span>
        <small>Check your internet connection. If this account is not an admin, nothing will load.</small>
        <div className="sq-row">
          <button type="button" className="btn btn-primary btn-sm" onClick={retry}>Try again</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  // Shown in the page's own top row, so saving never costs a row of the screen.
  const badge = (
    <span className={`sq-sync ${syncError ? 'bad' : saving ? 'busy' : ''}`} role="status">
      <i aria-hidden="true" />
      <span>{syncError ? 'Not saved' : saving ? 'Saving…' : 'Saved'}</span>
    </span>
  );

  return (
    <div className="sq-root">
      {syncError && (
        <div className="sq-alert" role="alert">
          <span>{syncError}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>Reload</button>
        </div>
      )}
      {matchId && match
        ? <MatchView key={match.id} match={match} players={state.players} act={act} badge={badge} />
        : <Home state={state} act={act} missing={Boolean(matchId)} badge={badge} email={email} />}
      {localOffer && (
        <Modal onClose={declineLocal} labelledBy="offer-title" sheet>
          <h2 className="modal-title" id="offer-title">Move this phone&apos;s data to the database?</h2>
          <p className="modal-desc">
            This device has {localOffer.players.length} players and {localOffer.matches.length} matches saved from before. The database is empty.
          </p>
          <div className="btn-grid btn-grid-2">
            <button type="button" className="btn btn-secondary btn-md" onClick={declineLocal}>Not now</button>
            <button type="button" className="btn btn-primary btn-md" onClick={acceptLocal}>Move it</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home: next match, schedule, other matches, squad
// ---------------------------------------------------------------------------
const countsOf = (m, playerCount) => {
  const replies = Object.values(m.status);
  const inCount = replies.filter(s => s === 'in').length;
  return { in: inCount, out: replies.length - inCount, waiting: Math.max(0, playerCount - replies.length) };
};

// Where a match stands, and what the admin does next when they open it.
const stageOf = (m, playerCount) => {
  if (m.draft.final) return { label: 'Teams ready', cls: 'ok', action: 'View teams' };
  if (m.draft.captains.A) return { label: 'Picking', cls: 'warn', action: 'Keep picking' };
  const c = countsOf(m, playerCount);
  return { label: 'IN / OUT', cls: '', action: c.in >= 2 && !c.waiting ? 'Pick teams' : 'Mark IN / OUT' };
};

const howSoon = (when) => {
  const n = daysAway(when);
  if (n > 1) return `In ${n} days`;
  return n === 1 ? 'Tomorrow' : n === 0 ? 'Today' : 'Yesterday';
};

const matchHref = (m) => `${MATCH_DAY_HASH}/${m.id}`;

// Most groups play at the same time every week: suggest the time used most often
// (the more recent match wins a tie), and 6:00 AM until there is any history.
const usualTime = (matches) => {
  const seen = {};
  let best = '06:00';
  for (const m of [...matches].sort((a, b) => whenTime(a.when) - whenTime(b.when))) {
    const t = m.when.slice(11);
    seen[t] = (seen[t] || 0) + 1;
    if (seen[t] >= (seen[best] || 0)) best = t;
  }
  return best;
};

function Home({ state, act, missing, badge, email }) {
  const [flash, setFlash] = useFlash();
  const [ask, setAsk] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const [fresh, setFresh] = useState(''); // date-time of the match just scheduled: highlighted for a moment
  const today = useToday();
  const playerCount = state.players.length;

  // Upcoming = not older than 12 hours, so today's match stays on top during play.
  const cutoff = Date.now() - 12 * 3600e3;
  const sorted = [...state.matches].sort((a, b) => whenTime(a.when) - whenTime(b.when));
  const upcoming = sorted.filter(m => whenTime(m.when) >= cutoff);
  const past = sorted.filter(m => whenTime(m.when) < cutoff).reverse();
  const [next, ...later] = upcoming;

  useEffect(() => {
    if (!fresh) return undefined;
    const t = setTimeout(() => setFresh(''), 2400);
    return () => clearTimeout(t);
  }, [fresh]);

  const onScheduled = (when) => {
    setFresh(when);
    if (whenTime(when) < cutoff) setShowPast(true);
  };

  const row = (m, isPast) => {
    const cal = calendarParts(m.when);
    const stage = stageOf(m, playerCount);
    const sub = [cal.year, m.title, `${countsOf(m, playerCount).in} IN`].filter(Boolean).join(' · ');
    return (
      <li key={m.id}>
        <a className={`sq-mrow ${isPast ? 'past' : ''} ${fresh === m.when ? 'fresh' : ''}`} href={matchHref(m)}>
          <span className="sq-cal" aria-hidden="true"><small>{cal.month}</small><b>{cal.day}</b></span>
          <span className="sq-mrow-text">
            <b>{dayWord(m.when)} · {formatTime(m.when)}</b>
            <span>{sub}</span>
          </span>
          <span className={`sq-pill ${stage.cls}`}>{stage.label}</span>
          <NextIcon />
        </a>
      </li>
    );
  };

  return (
    <div className="sq-page sq-home page-enter">
      <header className="sq-top">
        <h1>Match day</h1>
        {badge}
      </header>
      {missing && <div className="inline-banner">That match was not found. It may have been deleted.</div>}
      {!playerCount && <div className="inline-banner">Start by adding your players under Squad, then schedule a match.</div>}

      <div className="sq-layout">
        <div className="stack">
          {next && <NextMatch m={next} playerCount={playerCount} fresh={fresh === next.when} />}

          <ScheduleForm matches={state.matches} act={act} today={today} setFlash={setFlash} onScheduled={onScheduled} />

          {(later.length > 0 || past.length > 0 || !next) && (
            <section className="card">
              <div className="card-header">
                Matches {later.length > 0 && <span className="card-header-meta">{later.length} more upcoming</span>}
              </div>
              <div className="card-content">
                {later.length > 0 && <ul className="sq-list">{later.map(m => row(m, false))}</ul>}
                {!next && <p className="sq-empty">No match scheduled. Pick a day above and tap Schedule.</p>}
                {past.length > 0 && (
                  <>
                    <button type="button" className="btn btn-ghost btn-sm sq-past-toggle" aria-expanded={showPast} onClick={() => setShowPast(v => !v)}>
                      {showPast ? 'Hide' : 'Show'} past matches ({past.length})
                    </button>
                    {showPast && <ul className="sq-list">{past.map(m => row(m, true))}</ul>}
                  </>
                )}
              </div>
            </section>
          )}
        </div>

        <Squad players={state.players} act={act} setAsk={setAsk} setFlash={setFlash} state={state} />
      </div>

      <footer className="sq-account">
        <span>Signed in as {email}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setAsk({ title: 'Sign out?', desc: 'You will need your email and password to sign in again.', yes: 'Sign out', onYes: () => supabase.auth.signOut() })}
        >
          Sign out
        </button>
      </footer>

      <Confirm ask={ask} onClose={() => setAsk(null)} />
      <Toast msg={flash} />
    </div>
  );
}

// The next match gets the top of the screen: one tap opens it on the step that is due.
function NextMatch({ m, playerCount, fresh }) {
  const c = countsOf(m, playerCount);
  const meta = [m.title, `${c.in} IN`, c.out ? `${c.out} OUT` : '', c.waiting ? `${c.waiting} waiting` : ''].filter(Boolean).join(' · ');
  return (
    <a className={`score-hero sq-next ${fresh ? 'fresh' : ''}`} href={matchHref(m)}>
      <span className="hero-chip">Next match · {howSoon(m.when)}</span>
      <span className="sq-next-when">{formatWhen(m.when, { short: true })}</span>
      <span className="sq-next-meta">{meta}</span>
      <span className="sq-next-cta">{stageOf(m, playerCount).action}<NextIcon /></span>
    </a>
  );
}

function ScheduleForm({ matches, act, today, setFlash, onScheduled }) {
  const days = useMemo(() => nextDays(7, today), [today]);
  const [date, setDate] = useState(() => days[1].value);
  const [time, setTime] = useState(() => usualTime(matches));
  const [title, setTitle] = useState('');
  const when = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}/.test(time) ? `${date}T${time.slice(0, 5)}` : '';
  const isPast = Boolean(when) && whenTime(when) < Date.now();

  const submit = (e) => {
    e.preventDefault();
    if (!when) return;
    // A second tap, or the same slot twice, must not create a twin match.
    if (matches.some(m => m.when === when)) {
      setFlash('A match is already scheduled for that time');
    } else {
      act('addMatch', { when, title });
      setTitle('');
      setFlash('Match scheduled');
    }
    onScheduled(when);
  };

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-header">Schedule a match</div>
      <div className="card-content sq-form">
        <div className="sq-days" role="group" aria-label="Day">
          {days.map(d => (
            <button key={d.value} type="button" className={`sq-day ${date === d.value ? 'on' : ''}`} aria-pressed={date === d.value} onClick={() => setDate(d.value)}>
              <small>{d.label}</small>
              <b>{d.day}</b>
            </button>
          ))}
        </div>
        <div className="sq-form-row">
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Date" required />
          <input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} aria-label="Time" required />
        </div>
        {isPast && <p className="sq-note warn" role="status">That time has already passed.</p>}
        <div className="sq-form-row end">
          <input className="input" value={title} maxLength={NAME_MAX} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" aria-label="Title (optional)" autoComplete="off" />
          <button type="submit" className="btn btn-primary btn-md" disabled={!when}>Schedule</button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Squad (permanent player list)
// ---------------------------------------------------------------------------
function Squad({ players, act, setAsk, setFlash, state }) {
  const [name, setName] = useState('');
  const [jersey, setJersey] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const nameRef = useRef(null);
  const fileRef = useRef(null);

  const sorted = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
  // The player who already has this name (ignoring capitals and extra spaces), if any.
  const twin = (n, exceptId) => players.find(p => p.id !== exceptId && p.name.toLowerCase() === cleanName(n).toLowerCase());

  const add = (e) => {
    e.preventDefault();
    const clean = cleanName(name);
    if (!clean) return;
    const same = twin(clean);
    if (same) { setError(`${same.name} is already in the squad.`); return; }
    act('addPlayer', { name, jersey });
    setName('');
    setJersey('');
    setFlash(`${clean} added`);
    nameRef.current?.focus();
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `squad-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importBackup = async (file) => {
    if (!file) return;
    if (file.size > 1_000_000) { setFlash('Backup file is too large'); return; }
    try {
      const data = sanitize(JSON.parse(await file.text()));
      setAsk({
        title: 'Restore backup?',
        desc: `${data.players.length} players and ${data.matches.length} matches will replace everything in the database.`,
        yes: 'Restore',
        onYes: () => { act('replace', { data }); setFlash('Backup restored'); },
      });
    } catch {
      setFlash('That file is not a valid backup');
    }
  };

  return (
    <section className="card sq-squad">
      <div className="card-header">
        Squad <span className="card-header-meta">{players.length} player{players.length === 1 ? '' : 's'}</span>
      </div>
      <div className="card-content">
        <form className="sq-add" onSubmit={add}>
          <input ref={nameRef} className="input" value={name} maxLength={NAME_MAX} onChange={e => { setName(e.target.value); setError(''); }} placeholder="Player name" aria-label="Player name" autoComplete="off" enterKeyHint="done" />
          <input className="input sq-jersey-input" value={jersey} inputMode="numeric" maxLength={3} onChange={e => setJersey(e.target.value.replace(/\D/g, ''))} placeholder="No." aria-label="Jersey number (optional)" autoComplete="off" />
          <button type="submit" className="btn btn-primary btn-md" disabled={!name.trim()}>Add</button>
        </form>
        {error && <p className="sq-note bad sq-mt-sm" role="alert">{error}</p>}

        {sorted.length ? (
          <>
            <div className="sq-grid sq-mt">
              {sorted.map(p => (
                <button key={p.id} type="button" className="sq-tile" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}>
                  <span className="sq-tile-name">{p.name}</span>
                  <Num n={p.jersey} />
                </button>
              ))}
            </div>
            <p className="sq-note sq-mt-sm">Tap a player to edit or remove.</p>
          </>
        ) : (
          <p className="sq-empty">Add your regular players once. They stay saved for every match.</p>
        )}

        <div className="sq-backup">
          <span>Saved in your database</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportBackup} disabled={!players.length && !state.matches.length}>Backup</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Restore</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => { importBackup(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>

      {editing && (
        <EditPlayer
          player={editing}
          onClose={() => setEditing(null)}
          onSave={(n, j) => {
            const same = twin(n, editing.id);
            if (same) return `${same.name} is already in the squad.`;
            act('updatePlayer', { id: editing.id, name: n, jersey: j });
            setEditing(null);
            return '';
          }}
          onDelete={() => {
            const p = editing;
            setEditing(null);
            setAsk({ danger: true, title: `Remove ${p.name}?`, desc: 'They will also be removed from every match and team.', yes: 'Remove', onYes: () => act('deletePlayer', { id: p.id }) });
          }}
        />
      )}
    </section>
  );
}

function EditPlayer({ player, onClose, onSave, onDelete }) {
  const [name, setName] = useState(player.name);
  const [jersey, setJersey] = useState(player.jersey);
  const [error, setError] = useState('');
  // On a phone the keyboard should not jump up for someone who only wants "Remove".
  const [touch] = useState(() => window.matchMedia?.('(pointer: coarse)').matches ?? false);
  const save = (e) => {
    e.preventDefault();
    if (name.trim()) setError(onSave(name, jersey));
  };
  return (
    <Modal onClose={onClose} labelledBy="edit-player-title">
      <form onSubmit={save}>
        <ModalHead id="edit-player-title" title="Edit player" onClose={onClose} />
        <div className="sq-edit">
          <label className="field">
            <span className="field-label">Name</span>
            <input className="input" value={name} maxLength={NAME_MAX} onChange={e => { setName(e.target.value); setError(''); }} autoComplete="off" autoFocus={!touch} />
          </label>
          <label className="field">
            <span className="field-label">No.</span>
            <input className="input sq-jersey-input" value={jersey} inputMode="numeric" maxLength={3} onChange={e => setJersey(e.target.value.replace(/\D/g, ''))} autoComplete="off" />
          </label>
        </div>
        {error && <p className="sq-note bad sq-mt-sm" role="alert">{error}</p>}
        <div className="btn-grid btn-grid-2 sq-mt">
          <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-md" disabled={!name.trim()}>Save</button>
        </div>
        <button type="button" className="btn btn-ghost btn-sm btn-block sq-danger-link sq-mt-sm" onClick={onDelete}>
          <TrashIcon /> Remove player
        </button>
      </form>
    </Modal>
  );
}
