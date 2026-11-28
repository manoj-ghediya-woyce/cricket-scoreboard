import { useEffect, useMemo, useRef, useState } from 'react';
import { useSquadStore, NAME_MAX, sanitize } from './squadStore';
import { MATCH_DAY_HASH, MATCH_DAY_PATH } from './route';
import { supabase } from './db';
import { Confirm, Modal, Jersey, Toast, TrashIcon } from './ui';
import { defaultWhen, formatWhen, useFlash, whenTime } from './utils';
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
        <div className="sq-share">
          <button type="button" className="btn btn-primary btn-sm" onClick={retry}>Try again</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`sq-sync ${syncError ? 'bad' : ''}`} role="status">
        <span className="sq-sync-dot" aria-hidden="true" />
        <span className="sq-sync-text">{syncError || (saving ? 'Saving…' : 'Saved')}</span>
        <span className="sq-sync-user">{email}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
      {matchId && match
        ? <MatchView match={match} players={state.players} act={act} />
        : <Home state={state} act={act} missing={Boolean(matchId)} />}
      {localOffer && (
        <Modal onClose={declineLocal} labelledBy="offer-title">
          <div className="modal-icon">📥</div>
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Home: schedule + match list + squad
// ---------------------------------------------------------------------------
const stageOf = (m) => {
  if (m.draft.final) return { label: 'Teams ready', cls: 'ok' };
  if (m.draft.captains.A) return { label: 'Picking', cls: 'warn' };
  return { label: 'Availability', cls: '' };
};

function Home({ state, act, missing }) {
  const [flash, setFlash] = useFlash();
  const [ask, setAsk] = useState(null);
  const [when, setWhen] = useState(defaultWhen);
  const [title, setTitle] = useState('');
  const [showPast, setShowPast] = useState(false);

  // Upcoming = not older than 12 hours, so today's match stays on top during play.
  const { upcoming, past } = useMemo(() => {
    const cutoff = Date.now() - 12 * 3600e3;
    const sorted = [...state.matches].sort((a, b) => whenTime(a.when) - whenTime(b.when));
    return {
      upcoming: sorted.filter(m => whenTime(m.when) >= cutoff),
      past: sorted.filter(m => whenTime(m.when) < cutoff).reverse(),
    };
  }, [state.matches]);

  const schedule = (e) => {
    e.preventDefault();
    if (!when) return;
    act('addMatch', { when, title });
    setTitle('');
    setFlash('Match scheduled ✓');
  };

  const row = (m) => {
    const stage = stageOf(m);
    const inCount = Object.values(m.status).filter(s => s === 'in').length;
    return (
      <li key={m.id} className="sq-match-row">
        <a className="sq-match-link" href={`${MATCH_DAY_HASH}/${m.id}`}>
          <span className="sq-match-date">{formatWhen(m.when)}</span>
          <span className="sq-match-sub">
            {m.title && <span className="sq-match-title">{m.title}</span>}
            <span className="sq-pill in">{inCount} IN</span>
            <span className={`sq-pill ${stage.cls}`}>{stage.label}</span>
          </span>
        </a>
        <button
          type="button"
          className="icon-btn sq-icon-danger"
          aria-label="Delete match"
          onClick={() => setAsk({ danger: true, title: 'Delete this match?', desc: `${formatWhen(m.when)} — availability and teams will be removed.`, yes: 'Delete', onYes: () => act('deleteMatch', { id: m.id }) })}
        >
          <TrashIcon />
        </button>
      </li>
    );
  };

  return (
    <div className="sq-page page-enter">
      {missing && <div className="inline-banner">That match was deleted or isn&apos;t on this device.</div>}

      <section className="score-hero sq-hero">
        <span className="hero-chip">Match day</span>
        <h1>Schedule · Availability · Team picks</h1>
        <p>Mark players IN/OUT from WhatsApp replies, pick two captains, then let them choose one player at a time.</p>
      </section>

      <div className="sq-layout">
        <div className="stack">
          <form className="card" onSubmit={schedule}>
            <div className="card-header">Schedule a match</div>
            <div className="card-content sq-schedule">
              <label className="field">
                <span className="field-label">Date &amp; time</span>
                <input className="input input-lg" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} required />
              </label>
              <label className="field">
                <span className="field-label">Title (optional)</span>
                <input className="input input-lg" value={title} maxLength={NAME_MAX} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sunday box cricket" />
              </label>
              <button type="submit" className="btn btn-primary btn-md">Schedule</button>
            </div>
          </form>

          <div className="card">
            <div className="card-header">
              Matches <span className="card-header-meta">{upcoming.length} upcoming</span>
            </div>
            <div className="card-content">
              {upcoming.length ? <ul className="sq-list">{upcoming.map(row)}</ul> : (
                <div className="empty-state"><div className="empty-state-icon">📅</div>No upcoming matches. Schedule one above.</div>
              )}
              {past.length > 0 && (
                <>
                  <button type="button" className="btn btn-ghost btn-sm sq-past-toggle" onClick={() => setShowPast(v => !v)}>
                    {showPast ? 'Hide' : 'Show'} past matches ({past.length})
                  </button>
                  {showPast && <ul className="sq-list">{past.map(row)}</ul>}
                </>
              )}
            </div>
          </div>
        </div>

        <Squad players={state.players} act={act} setAsk={setAsk} setFlash={setFlash} state={state} />
      </div>

      <Confirm ask={ask} onClose={() => setAsk(null)} />
      <Toast msg={flash} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Squad (permanent player list)
// ---------------------------------------------------------------------------
function Squad({ players, act, setAsk, setFlash, state }) {
  const [name, setName] = useState('');
  const [jersey, setJersey] = useState('');
  const [editing, setEditing] = useState(null);
  const nameRef = useRef(null);
  const fileRef = useRef(null);

  const sorted = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
  const dupe = (n, exceptId) => players.some(p => p.id !== exceptId && p.name.toLowerCase() === n.trim().toLowerCase());

  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (dupe(name)) { setFlash(`${name.trim()} is already in the squad`); return; }
    act('addPlayer', { name, jersey });
    setName('');
    setJersey('');
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
        icon: '📥',
        onYes: () => { act('replace', { data }); setFlash('Backup restored ✓'); },
      });
    } catch {
      setFlash('That file is not a valid backup');
    }
  };

  return (
    <div className="card sq-squad">
      <div className="card-header">
        Squad <span className="card-header-meta">{players.length} players</span>
      </div>
      <div className="card-content">
        <form className="sq-add" onSubmit={add}>
          <input ref={nameRef} className="input input-lg" value={name} maxLength={NAME_MAX} onChange={e => setName(e.target.value)} placeholder="Player name" aria-label="Player name" />
          <input className="input input-lg sq-jersey-input" value={jersey} inputMode="numeric" maxLength={3} onChange={e => setJersey(e.target.value.replace(/\D/g, ''))} placeholder="No." aria-label="Jersey number (optional)" />
          <button type="submit" className="btn btn-primary btn-md" disabled={!name.trim()}>Add</button>
        </form>

        {sorted.length ? (
          <ul className="sq-list sq-players">
            {sorted.map(p => (
              <li key={p.id} className="sq-player">
                <Jersey n={p.jersey} />
                <span className="sq-player-name">{p.name}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>Edit</button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state"><div className="empty-state-icon">👥</div>Add your regular players once — they stay saved in your database.</div>
        )}

        <div className="sq-backup">
          <span>Saved in your database.</span>
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
            if (dupe(n, editing.id)) { setFlash(`${n.trim()} is already in the squad`); return; }
            act('updatePlayer', { id: editing.id, name: n, jersey: j });
            setEditing(null);
          }}
          onDelete={() => {
            const p = editing;
            setEditing(null);
            setAsk({ danger: true, title: `Remove ${p.name}?`, desc: 'They will also be removed from every match and team.', yes: 'Remove', onYes: () => act('deletePlayer', { id: p.id }) });
          }}
        />
      )}
    </div>
  );
}

function EditPlayer({ player, onClose, onSave, onDelete }) {
  const [name, setName] = useState(player.name);
  const [jersey, setJersey] = useState(player.jersey);
  const save = (e) => { e.preventDefault(); if (name.trim()) onSave(name, jersey); };
  return (
    <Modal onClose={onClose} labelledBy="edit-player-title">
      <form onSubmit={save}>
        <h2 className="modal-title" id="edit-player-title">Edit player</h2>
        <div className="modal-body">
          <label className="field">
            <span className="field-label">Name</span>
            <input className="input input-lg" value={name} maxLength={NAME_MAX} onChange={e => setName(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Jersey number (optional)</span>
            <input className="input input-lg" value={jersey} inputMode="numeric" maxLength={3} onChange={e => setJersey(e.target.value.replace(/\D/g, ''))} />
          </label>
        </div>
        <div className="btn-grid btn-grid-2">
          <button type="button" className="btn btn-danger-soft btn-md" onClick={onDelete}>Remove</button>
          <button type="submit" className="btn btn-primary btn-md" disabled={!name.trim()}>Save</button>
        </div>
      </form>
    </Modal>
  );
}
