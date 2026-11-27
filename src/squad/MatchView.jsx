import { useMemo, useState } from 'react';
import { NAME_MAX, nextTurn, other, teamOf } from './squadStore';
import { MATCH_DAY_HASH } from './route';
import { Confirm, Jersey, Modal, ShareButtons, Toast, TrashIcon } from './ui';
import { formatWhen, useFlash } from './utils';

const STEPS = [
  { key: 'avail', label: 'IN / OUT' },
  { key: 'pick', label: 'Pick teams' },
  { key: 'teams', label: 'Teams' },
];

const initialStep = (d) => (d.final ? 'teams' : d.captains.A ? 'pick' : 'avail');

export function MatchView({ match, players, act }) {
  const [chosenStep, setStep] = useState(() => initialStep(match.draft));
  // "Teams" only exists once teams are confirmed (e.g. a new IN player re-opens picking).
  const step = chosenStep === 'teams' && !match.draft.final ? 'pick' : chosenStep;
  const [ask, setAsk] = useState(null);
  const [flash, setFlash] = useFlash();
  const [editing, setEditing] = useState(false);

  const byId = useMemo(() => Object.fromEntries(players.map(p => [p.id, p])), [players]);
  const inPlayers = useMemo(
    () => players.filter(p => match.status[p.id] === 'in').sort((a, b) => a.name.localeCompare(b.name)),
    [players, match.status],
  );
  const d = match.draft;
  const teamName = (t) => (d.captains[t] ? `Team ${byId[d.captains[t]]?.name}` : `Team ${t}`);
  const ctx = { match, players, byId, inPlayers, act, setAsk, setFlash, teamName, setStep };

  return (
    <div className="sq-page page-enter">
      <div className="sq-match-head">
        <a className="btn btn-ghost btn-sm sq-back" href={MATCH_DAY_HASH}>← Matches</a>
        <div className="sq-match-head-text">
          <h1>{formatWhen(match.when, { short: true })}</h1>
          {match.title && <p>{match.title}</p>}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
      </div>

      <nav className="sq-steps" aria-label="Match steps">
        {STEPS.map((s, i) => {
          const disabled = s.key === 'teams' && !d.final;
          return (
            <button
              key={s.key}
              type="button"
              className={`sq-step ${step === s.key ? 'active' : ''}`}
              onClick={() => setStep(s.key)}
              disabled={disabled}
              aria-current={step === s.key ? 'step' : undefined}
            >
              <span className="sq-step-no">{i + 1}</span>
              {s.label}
              {s.key === 'avail' && <span className="sq-step-count">{inPlayers.length}</span>}
            </button>
          );
        })}
      </nav>

      {step === 'avail' && <Availability {...ctx} />}
      {step === 'pick' && (d.captains.A ? <Draft {...ctx} /> : <CaptainSetup {...ctx} />)}
      {step === 'teams' && <FinalTeams {...ctx} />}

      {editing && (
        <EditMatch
          match={match}
          onClose={() => setEditing(false)}
          onSave={(when, title) => { act('updateMatch', { id: match.id, when, title }); setEditing(false); }}
          onDelete={() => {
            setEditing(false);
            setAsk({
              danger: true, title: 'Delete this match?', desc: 'Availability and teams will be removed.', yes: 'Delete',
              onYes: () => { act('deleteMatch', { id: match.id }); window.location.hash = MATCH_DAY_HASH; },
            });
          }}
        />
      )}
      <Confirm ask={ask} onClose={() => setAsk(null)} />
      <Toast msg={flash} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: IN / OUT
// ---------------------------------------------------------------------------
function Availability({ match, players, act, setAsk, setFlash, setStep, byId }) {
  const [q, setQ] = useState('');
  const d = match.draft;
  const counts = { in: 0, out: 0, pending: 0 };
  for (const p of players) counts[match.status[p.id] || 'pending'] += 1;

  // Stable alphabetical order, so rows never jump under the admin's thumb while tapping.
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return players
      .filter(p => !term || p.name.toLowerCase().includes(term) || p.jersey === term)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [players, q]);

  const set = (p, status) => {
    const next = match.status[p.id] === status ? null : status;
    const isCaptain = d.captains.A === p.id || d.captains.B === p.id;
    if (next !== 'in' && isCaptain) {
      setAsk({
        danger: true,
        title: `${p.name} is a captain`,
        desc: 'Marking them OUT clears both captains and all picks.',
        yes: 'Mark OUT & reset teams',
        onYes: () => act('setStatus', { matchId: match.id, playerId: p.id, status: next }),
      });
      return;
    }
    if (next !== 'in' && teamOf(d, p.id)) setFlash(`${p.name} removed from their team`);
    act('setStatus', { matchId: match.id, playerId: p.id, status: next });
  };

  const list = (s) => players.filter(p => match.status[p.id] === s).map(p => byId[p.id].name);
  const shareText = [
    `🏏 *${formatWhen(match.when)}*`,
    match.title,
    ' ',
    `✅ *IN (${counts.in}):* ${list('in').join(', ') || '—'}`,
    `❌ *OUT (${counts.out}):* ${list('out').join(', ') || '—'}`,
    counts.pending ? `⏳ *Not replied (${counts.pending}):* ${players.filter(p => !match.status[p.id]).map(p => p.name).join(', ')}` : '',
  ].filter(Boolean).join('\n');

  if (!players.length) {
    return (
      <div className="card"><div className="empty-state">
        <div className="empty-state-icon">👥</div>No players yet. <a href={MATCH_DAY_HASH}>Add your squad</a> first.
      </div></div>
    );
  }

  return (
    <div className="card">
      <div className="card-content">
        <div className="sq-tally">
          <div className="sq-tally-item in"><b className="num">{counts.in}</b>IN</div>
          <div className="sq-tally-item out"><b className="num">{counts.out}</b>OUT</div>
          <div className="sq-tally-item"><b className="num">{counts.pending}</b>Pending</div>
        </div>

        <div className="sq-toolbar">
          {players.length > 8 && (
            <input className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or number" aria-label="Search players" />
          )}
          {counts.pending > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => act('setAllPending', { matchId: match.id, status: 'out' })}>
              Rest OUT
            </button>
          )}
        </div>

        <ul className="sq-list">
          {shown.map(p => {
            const s = match.status[p.id];
            return (
              <li key={p.id} className={`sq-avail ${s || ''}`}>
                <Jersey n={p.jersey} />
                <span className="sq-player-name">{p.name}</span>
                <div className="sq-toggle" role="group" aria-label={`${p.name} availability`}>
                  <button type="button" className={`in ${s === 'in' ? 'on' : ''}`} aria-pressed={s === 'in'} onClick={() => set(p, 'in')}>IN</button>
                  <button type="button" className={`out ${s === 'out' ? 'on' : ''}`} aria-pressed={s === 'out'} onClick={() => set(p, 'out')}>OUT</button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="sq-footer-actions">
          <ShareButtons text={shareText} onCopied={setFlash} />
          <button type="button" className="btn btn-primary btn-md" disabled={counts.in < 2} onClick={() => setStep(d.final ? 'teams' : 'pick')}>
            {d.final ? 'View teams →' : 'Pick teams →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2a: choose captains + who picks first
// ---------------------------------------------------------------------------
function CaptainSetup({ match, inPlayers, act, setStep }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [first, setFirst] = useState('A');
  const [tossed, setTossed] = useState(false);

  if (inPlayers.length < 2) {
    return (
      <div className="card"><div className="empty-state">
        <div className="empty-state-icon">🙋</div>Mark at least 2 players IN to pick captains.
        <div><button type="button" className="btn btn-soft btn-sm sq-mt" onClick={() => setStep('avail')}>Go to availability</button></div>
      </div></div>
    );
  }

  const name = (id) => inPlayers.find(p => p.id === id)?.name;
  const label = (t) => (t === 'A' ? name(a) : name(b)) || `Captain ${t === 'A' ? 1 : 2}`;
  const toss = () => { setFirst(Math.random() < 0.5 ? 'A' : 'B'); setTossed(true); };
  const ready = a && b && a !== b;

  // One list: first tap = Captain 1, second tap = Captain 2, tap again to clear.
  const tap = (id) => {
    if (a === id) setA('');
    else if (b === id) setB('');
    else if (!a) setA(id);
    else setB(id);
  };

  return (
    <div className="card">
      <div className="card-header">Choose captains <span className="card-header-meta">tap two players</span></div>
      <div className="card-content">
        <div className="sq-cap-slots">
          {[['A', a, setA], ['B', b, setB]].map(([t, val, setVal], i) => (
            <button key={t} type="button" className={`sq-cap-slot team-${t} ${val ? 'filled' : ''}`} onClick={() => setVal('')} disabled={!val} aria-label={val ? `Clear captain ${i + 1}` : undefined}>
              <small>Captain {i + 1}</small>
              <b>{name(val) || 'Tap a player'}</b>
              {val && <span className="sq-cap-x" aria-hidden="true">✕</span>}
            </button>
          ))}
        </div>

        <div className="sq-pick-grid">
          {inPlayers.map(p => {
            const role = a === p.id ? 'A' : b === p.id ? 'B' : null;
            return (
              <button key={p.id} type="button" className={`sq-pool-btn ${role ? `picked team-${role}` : ''}`} aria-pressed={Boolean(role)} onClick={() => tap(p.id)}>
                <Jersey n={p.jersey} />
                <span className="sq-pool-name">{p.name}</span>
                {role && <span className="sq-c-badge">C{role === 'A' ? 1 : 2}</span>}
              </button>
            );
          })}
        </div>

        <div className="sq-first">
          <span className="field-label">First pick</span>
          <div className="chip-row">
            {['A', 'B'].map(t => (
              <button key={t} type="button" className={`chip ${first === t ? 'active' : ''}`} onClick={() => { setFirst(t); setTossed(false); }}>
                {label(t)}
              </button>
            ))}
            <button type="button" className="chip" onClick={toss}>🪙 Toss</button>
          </div>
          {tossed && ready && <p className="sq-hint">Toss won by <b>{label(first)}</b> — picks first.</p>}
        </div>

        <button
          type="button"
          className="btn btn-primary btn-md btn-block sq-mt"
          disabled={!ready}
          onClick={() => act('startDraft', { matchId: match.id, A: a, B: b, first })}
        >
          Start picking
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2b: alternate picks
// ---------------------------------------------------------------------------
function Draft({ match, inPlayers, byId, act, setAsk, teamName, setStep }) {
  const d = match.draft;
  const [capFor, setCapFor] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const pool = inPlayers.filter(p => !teamOf(d, p.id));
  const turn = nextTurn(d);
  const done = pool.length === 0;

  const pick = (p) => act('pick', { matchId: match.id, playerId: p.id });

  return (
    <>
      <div className={`sq-turn team-${done ? 'done' : turn}`} aria-live="polite">
        {done ? (
          <><span>All players picked 🎉</span><small>Check the teams, then confirm.</small></>
        ) : (
          <><span><b>{byId[d.captains[turn]]?.name}</b>&apos;s pick</span><small>{pool.length} left · pick {d.picks.length + 1}</small></>
        )}
      </div>

      {!done && (
        <div className="card">
          <div className="card-header">Available <span className="card-header-meta">tap to pick for {teamName(turn)}</span></div>
          <div className="card-content">
            <div className="sq-pool">
              {pool.map(p => (
                <button key={p.id} type="button" className={`sq-pool-btn team-${turn}`} onClick={() => pick(p)}>
                  <Jersey n={p.jersey} />
                  <span className="sq-pool-name">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <TeamColumns
        d={d} byId={byId} teamName={teamName} turn={done ? null : turn}
        onCaptain={setCapFor}
        onPlayer={setMenuFor}
      />

      <div className="sq-sticky-actions">
        <button type="button" className="btn btn-secondary btn-md" disabled={!d.picks.length} onClick={() => act('undoPick', { matchId: match.id })}>
          ↶ Undo
        </button>
        <button
          type="button"
          className="btn btn-danger-soft btn-md"
          aria-label="Delete teams"
          onClick={() => setAsk({ danger: true, title: 'Delete teams?', desc: 'Captains and all picks will be cleared. Availability stays.', yes: 'Delete teams', onYes: () => act('resetDraft', { matchId: match.id }) })}
        >
          <TrashIcon />
        </button>
        <button
          type="button"
          className="btn btn-primary btn-md"
          disabled={!done}
          onClick={() => { act('setFinal', { matchId: match.id, final: true }); setStep('teams'); }}
        >
          ✓ Confirm
        </button>
      </div>

      {capFor && <CaptainModal team={capFor} d={d} inPlayers={inPlayers} byId={byId} teamName={teamName} onClose={() => setCapFor(null)} onPick={(id) => { act('changeCaptain', { matchId: match.id, team: capFor, playerId: id }); setCapFor(null); }} />}
      {menuFor && (
        <Modal onClose={() => setMenuFor(null)} labelledBy="pm-title">
          <h2 className="modal-title" id="pm-title">{byId[menuFor]?.name}</h2>
          <p className="modal-desc">In {teamName(teamOf(d, menuFor))}</p>
          <div className="sq-menu">
            <button type="button" className="btn btn-secondary btn-md" onClick={() => { act('movePick', { matchId: match.id, playerId: menuFor }); setMenuFor(null); }}>
              ⇄ Move to {teamName(other(teamOf(d, menuFor)))}
            </button>
            <button type="button" className="btn btn-secondary btn-md" onClick={() => { act('removePick', { matchId: match.id, playerId: menuFor }); setMenuFor(null); }}>
              ↩ Back to available
            </button>
            <button type="button" className="btn btn-ghost btn-md" onClick={() => setMenuFor(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function TeamColumns({ d, byId, teamName, turn, onCaptain, onPlayer }) {
  return (
    <div className="sq-teams">
      {['A', 'B'].map(t => {
        const members = d.picks.filter(p => p.team === t);
        const cap = byId[d.captains[t]];
        return (
          <section key={t} className={`card sq-team team-${t} ${turn === t ? 'is-turn' : ''}`}>
            <header className="sq-team-head">
              <span className="sq-team-name">{teamName(t)}</span>
              <span className="sq-team-count num">{members.length + 1}</span>
            </header>
            <ol className="sq-team-list">
              <li className="sq-cap">
                <Jersey n={cap?.jersey} />
                <span className="sq-player-name">{cap?.name}</span>
                <span className="sq-c-badge" title="Captain">C</span>
                {onCaptain && <button type="button" className="btn btn-ghost btn-sm sq-mini" aria-label={`Change captain of ${teamName(t)}`} onClick={() => onCaptain(t)}>✎</button>}
              </li>
              {members.map(m => (
                <li key={m.id}>
                  <Jersey n={byId[m.id]?.jersey} />
                  <span className="sq-player-name">{byId[m.id]?.name}</span>
                  {onPlayer && <button type="button" className="btn btn-ghost btn-sm sq-mini" aria-label={`Edit ${byId[m.id]?.name}`} onClick={() => onPlayer(m.id)}>⋯</button>}
                </li>
              ))}
              {!members.length && <li className="sq-team-empty">No picks yet</li>}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function CaptainModal({ team, d, inPlayers, byId, teamName, onClose, onPick }) {
  const members = d.picks.filter(p => p.team === team).map(p => byId[p.id]).filter(Boolean);
  const pool = inPlayers.filter(p => !teamOf(d, p.id));
  const group = (title, list, note) => list.length > 0 && (
    <div>
      <span className="field-label">{title}</span>
      {note && <p className="sq-hint">{note}</p>}
      <div className="sq-pick-grid sq-mt-sm">
        {list.map(p => (
          <button key={p.id} type="button" className="sq-pool-btn" onClick={() => onPick(p.id)}>
            <Jersey n={p.jersey} />
            <span className="sq-pool-name">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <Modal onClose={onClose} labelledBy="cap-title">
      <div className="modal-icon">©️</div>
      <h2 className="modal-title" id="cap-title">Change captain · {teamName(team)}</h2>
      <p className="modal-desc">Current: <b>{byId[d.captains[team]]?.name}</b></p>
      <div className="modal-body">
        {group('From this team', members, 'Swaps roles — the old captain stays in the team.')}
        {group('From available players', pool, 'The old captain goes back to available.')}
        {!members.length && !pool.length && <p className="sq-hint">No other players to choose from.</p>}
      </div>
      <button type="button" className="btn btn-secondary btn-md btn-block" onClick={onClose}>Cancel</button>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Step 3: final teams
// ---------------------------------------------------------------------------
function FinalTeams({ match, byId, act, setAsk, setFlash, teamName, setStep, inPlayers }) {
  const d = match.draft;
  const [capFor, setCapFor] = useState(null);

  const lines = ['A', 'B'].flatMap(t => {
    const cap = byId[d.captains[t]];
    const members = d.picks.filter(p => p.team === t).map(p => byId[p.id]);
    // "1)" not "1.": WhatsApp turns "1." lines into its own numbered list, which indents unevenly.
    const fmt = (p, i, c) => `${i}) ${p.name}${c ? ' (C)' : ''}${p.jersey ? ` #${p.jersey}` : ''}`;
    return [
      '',
      `*${teamName(t)}* (${members.length + 1})`,
      fmt(cap, 1, true),
      ...members.map((p, i) => fmt(p, i + 2, false)),
    ];
  });
  const shareText = [`🏏 *${formatWhen(match.when)}*`, ...(match.title ? [match.title] : []), ...lines].join('\n');

  return (
    <>
      <div className="sq-final-banner">
        <span>Teams are set ✓</span>
        <ShareButtons text={shareText} onCopied={setFlash} />
      </div>

      <TeamColumns d={d} byId={byId} teamName={teamName} onCaptain={setCapFor} />

      <div className="sq-footer-actions">
        <button type="button" className="btn btn-secondary btn-md" onClick={() => { act('setFinal', { matchId: match.id, final: false }); setStep('pick'); }}>
          ✎ Edit teams
        </button>
        <button
          type="button"
          className="btn btn-danger-soft btn-md"
          onClick={() => setAsk({ danger: true, title: 'Delete teams?', desc: 'Captains and all picks will be cleared. Availability stays.', yes: 'Delete teams', onYes: () => { act('resetDraft', { matchId: match.id }); setStep('pick'); } })}
        >
          <TrashIcon /> Delete teams
        </button>
      </div>

      {capFor && <CaptainModal team={capFor} d={d} inPlayers={inPlayers} byId={byId} teamName={teamName} onClose={() => setCapFor(null)} onPick={(id) => { act('changeCaptain', { matchId: match.id, team: capFor, playerId: id }); setCapFor(null); }} />}
    </>
  );
}

function EditMatch({ match, onClose, onSave, onDelete }) {
  const [when, setWhen] = useState(match.when);
  const [title, setTitle] = useState(match.title);
  return (
    <Modal onClose={onClose} labelledBy="edit-match-title">
      <form onSubmit={(e) => { e.preventDefault(); if (when) onSave(when, title); }}>
        <h2 className="modal-title" id="edit-match-title">Edit match</h2>
        <div className="modal-body">
          <label className="field">
            <span className="field-label">Date &amp; time</span>
            <input className="input input-lg" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">Title (optional)</span>
            <input className="input input-lg" value={title} maxLength={NAME_MAX} onChange={e => setTitle(e.target.value)} />
          </label>
        </div>
        <div className="btn-grid btn-grid-2">
          <button type="button" className="btn btn-danger-soft btn-md" onClick={onDelete}>Delete</button>
          <button type="submit" className="btn btn-primary btn-md">Save</button>
        </div>
      </form>
    </Modal>
  );
}
