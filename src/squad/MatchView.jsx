import { useCallback, useMemo, useRef, useState } from 'react';
import { NAME_MAX, nextTurn, other, teamOf } from './squadStore';
import { MATCH_DAY_HASH } from './route';
import {
  ActionBar, BackIcon, CheckIcon, CloseIcon, Confirm, DiceIcon, DotsIcon, Modal, ModalHead, NextIcon, Num,
  PencilIcon, ReturnIcon, ShareButtons, SwapIcon, Toast, TrashIcon, UndoIcon,
} from './ui';
import { formatWhen, useFlash } from './utils';

const STEPS = [
  { key: 'avail', label: 'IN / OUT' },
  { key: 'pick', label: 'Pick teams' },
  { key: 'teams', label: 'Teams' },
];

// Open on the step that is due: teams if confirmed, picking if it has started or
// everyone has replied, otherwise IN / OUT.
const initialStep = (match, players) => {
  if (match.draft.final) return 'teams';
  if (match.draft.captains.A) return 'pick';
  const replies = Object.values(match.status);
  const everyoneReplied = players.length > 0 && replies.length >= players.length;
  return everyoneReplied && replies.filter(s => s === 'in').length >= 2 ? 'pick' : 'avail';
};

export function MatchView({ match, players, act, badge }) {
  const [chosenStep, setChosenStep] = useState(() => initialStep(match, players));
  // "Teams" only exists once teams are confirmed (e.g. a new IN player re-opens picking).
  const step = chosenStep === 'teams' && !match.draft.final ? 'pick' : chosenStep;
  const [ask, setAsk] = useState(null);
  const [flash, setFlash] = useFlash();
  const [editing, setEditing] = useState(false);

  // Every step starts at the top, even when the last one was left scrolled to its end.
  const setStep = useCallback((next) => {
    setChosenStep(next);
    window.scrollTo({ top: 0 });
  }, []);

  const byId = useMemo(() => Object.fromEntries(players.map(p => [p.id, p])), [players]);
  const inPlayers = useMemo(
    () => players.filter(p => match.status[p.id] === 'in').sort((a, b) => a.name.localeCompare(b.name)),
    [players, match.status],
  );
  const d = match.draft;
  const teamName = (t) => (d.captains[t] ? `Team ${byId[d.captains[t]]?.name}` : `Team ${t}`);
  const ctx = { match, players, byId, inPlayers, act, setAsk, setFlash, teamName, setStep };

  return (
    <div className="sq-page sq-match page-enter">
      <header className="sq-head">
        <a className="icon-btn" href={MATCH_DAY_HASH} aria-label="Back to all matches"><BackIcon /></a>
        <div className="sq-head-text">
          <h1>{formatWhen(match.when, { short: true })}</h1>
          {match.title && <p>{match.title}</p>}
        </div>
        {badge}
        <button type="button" className="icon-btn" aria-label="Edit match" onClick={() => setEditing(true)}><PencilIcon /></button>
      </header>

      <nav className="sq-steps" aria-label="Match steps">
        {STEPS.map(s => (
          <button
            key={s.key}
            type="button"
            className={`sq-step ${step === s.key ? 'active' : ''}`}
            onClick={() => setStep(s.key)}
            disabled={s.key === 'teams' && !d.final}
            aria-current={step === s.key ? 'step' : undefined}
          >
            {s.label}
            {s.key === 'avail' && <span className="sq-step-count">{inPlayers.length}</span>}
          </button>
        ))}
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
              danger: true, title: 'Delete this match?', desc: 'Its IN / OUT list and teams will be removed.', yes: 'Delete',
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
function Availability({ match, players, act, setAsk, setFlash, setStep }) {
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

  const names = (s) => players.filter(p => match.status[p.id] === s).map(p => p.name);
  const shareText = [
    `🏏 *${formatWhen(match.when)}*`,
    match.title,
    ' ',
    `✅ *IN (${counts.in}):* ${names('in').join(', ') || '—'}`,
    `❌ *OUT (${counts.out}):* ${names('out').join(', ') || '—'}`,
    counts.pending ? `⏳ *Not replied (${counts.pending}):* ${players.filter(p => !match.status[p.id]).map(p => p.name).join(', ')}` : '',
  ].filter(Boolean).join('\n');

  if (!players.length) {
    return (
      <div className="card"><p className="sq-empty">No players yet. <a href={MATCH_DAY_HASH}>Add your squad</a> first.</p></div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="card-content">
          <div className="sq-tally">
            <span className="in"><b className="num">{counts.in}</b> IN</span>
            <span className="out"><b className="num">{counts.out}</b> OUT</span>
            <span><b className="num">{counts.pending}</b> waiting</span>
            {counts.pending > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAsk({
                  title: `Mark the other ${counts.pending} OUT?`,
                  desc: 'Everyone who has not replied becomes OUT. You can still switch any of them to IN.',
                  yes: 'Mark OUT',
                  onYes: () => act('setAllPending', { matchId: match.id, status: 'out' }),
                })}
              >
                Rest OUT
              </button>
            )}
          </div>

          {players.length > 8 && (
            <input className="input sq-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search" aria-label="Search players" />
          )}

          <ul className="sq-list">
            {shown.map(p => {
              const s = match.status[p.id];
              return (
                <li key={p.id} className={`sq-avail ${s || ''}`}>
                  <span className="sq-player-name">{p.name}</span>
                  <Num n={p.jersey} />
                  <div className="sq-toggle" role="group" aria-label={`${p.name} availability`}>
                    <button type="button" className={`in ${s === 'in' ? 'on' : ''}`} aria-pressed={s === 'in'} onClick={() => set(p, 'in')}>IN</button>
                    <button type="button" className={`out ${s === 'out' ? 'on' : ''}`} aria-pressed={s === 'out'} onClick={() => set(p, 'out')}>OUT</button>
                  </div>
                </li>
              );
            })}
          </ul>
          {!shown.length && <p className="sq-empty">No player matches that search.</p>}
        </div>
      </div>

      <ActionBar className="sq-bar-3">
        <ShareButtons text={shareText} onCopied={setFlash} />
        <button type="button" className="btn btn-primary btn-md" disabled={counts.in < 2} onClick={() => setStep(d.final ? 'teams' : 'pick')}>
          {d.final ? 'View teams' : 'Pick teams'} <NextIcon />
        </button>
      </ActionBar>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2a: choose captains + who picks first
// ---------------------------------------------------------------------------
function CaptainSetup({ match, inPlayers, act, setStep, setFlash }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [first, setFirst] = useState('A');

  if (inPlayers.length < 2) {
    return (
      <div className="card">
        <p className="sq-empty">Mark at least 2 players IN to pick captains.</p>
        <div className="sq-row sq-pad">
          <button type="button" className="btn btn-soft btn-sm" onClick={() => setStep('avail')}>Go to IN / OUT</button>
        </div>
      </div>
    );
  }

  const name = (id) => inPlayers.find(p => p.id === id)?.name;
  const ready = Boolean(a && b && a !== b);

  // One list: first tap = Captain 1, second tap = Captain 2, tap a captain again to clear.
  const tap = (id) => {
    if (a === id) setA('');
    else if (b === id) setB('');
    else if (!a) setA(id);
    else if (!b) setB(id);
    else setFlash('Two captains are chosen. Tap one of them to change.');
  };

  const toss = () => {
    const won = Math.random() < 0.5 ? 'A' : 'B';
    setFirst(won);
    setFlash(`${name(won === 'A' ? a : b)} won the toss and picks first`);
  };

  return (
    <>
      <div className="card">
        <div className="card-content">
          <div className="sq-cap-slots">
            {[['A', a, setA], ['B', b, setB]].map(([t, val, clear], i) => (
              <button
                key={t}
                type="button"
                className={`sq-cap-slot team-${t} ${val ? 'filled' : ''} ${!val && (t === 'A' || a) ? 'next' : ''}`}
                onClick={() => clear('')}
                disabled={!val}
                aria-label={val ? `Captain ${i + 1}: ${name(val)}. Tap to clear` : `Captain ${i + 1}: not chosen`}
              >
                <small>Captain {i + 1}</small>
                <b>{name(val) || 'Tap a player'}</b>
                {val && <CloseIcon />}
              </button>
            ))}
          </div>

          <div className="sq-grid">
            {inPlayers.map(p => {
              const role = a === p.id ? 'A' : b === p.id ? 'B' : null;
              return (
                <button key={p.id} type="button" className={`sq-tile ${role ? `on team-${role}` : ''}`} aria-pressed={Boolean(role)} onClick={() => tap(p.id)}>
                  <span className="sq-tile-name">{p.name}</span>
                  {role ? <span className="sq-c">C{role === 'A' ? 1 : 2}</span> : <Num n={p.jersey} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ActionBar>
        {ready && (
          <div className="sq-first">
            <span id="first-pick-label">Who picks first?</span>
            <div className="sq-seg" role="group" aria-labelledby="first-pick-label">
              {['A', 'B'].map(t => (
                <button key={t} type="button" className={`team-${t} ${first === t ? 'on' : ''}`} aria-pressed={first === t} onClick={() => setFirst(t)}>
                  {name(t === 'A' ? a : b)}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-secondary btn-md" onClick={toss}><DiceIcon /> Toss</button>
          </div>
        )}
        <button
          type="button"
          className="btn btn-primary btn-md"
          disabled={!ready}
          onClick={() => act('startDraft', { matchId: match.id, A: a, B: b, first })}
        >
          {ready ? 'Start picking' : a || b ? 'Choose 1 more captain' : 'Choose 2 captains'}
        </button>
      </ActionBar>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2b: alternate picks
// ---------------------------------------------------------------------------
function Draft({ match, inPlayers, byId, act, setAsk, teamName, setStep }) {
  const d = match.draft;
  const [capFor, setCapFor] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const lastTap = useRef(0);

  // Every player keeps the same place on the board for the whole draft: a picked player
  // is tinted in the team's colour instead of disappearing, so nothing moves under the thumb.
  const board = inPlayers.filter(p => p.id !== d.captains.A && p.id !== d.captains.B);
  const left = board.filter(p => !teamOf(d, p.id)).length;
  const done = left === 0;
  const turn = nextTurn(d);
  const lastPick = d.picks[d.picks.length - 1];
  const capName = (t) => byId[d.captains[t]]?.name;
  // After a move or a send-back one team can be short: its captain picks until they are level.
  const size = (t) => d.picks.filter(p => p.team === t).length;
  const behind = size(other(turn)) - size(turn);
  const levelling = behind > 1 || (behind === 1 && turn === d.first);

  const tapTile = (p) => {
    // A double tap must not act twice (pick, then open the menu of the player just picked).
    const now = Date.now();
    if (now - lastTap.current < 350) return;
    lastTap.current = now;
    if (teamOf(d, p.id)) setMenuFor(p.id);
    else act('pick', { matchId: match.id, playerId: p.id });
  };

  return (
    <>
      {done ? (
        <div className="sq-done" role="status">
          <CheckIcon />
          <span><b>All players are picked.</b> Check the teams, then confirm.</span>
        </div>
      ) : (
        <section className={`card sq-board team-${turn}`}>
          <header className="sq-turn" aria-live="polite">
            <span className="sq-turn-name">{capName(turn)}&apos;s pick</span>
            <span className="sq-turn-left">{levelling ? 'levelling teams · ' : ''}{left} left</span>
          </header>
          <div className="sq-grid">
            {board.map(p => {
              const t = teamOf(d, p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`sq-tile ${t ? `taken team-${t}` : ''}`}
                  aria-label={t ? `${p.name}, in ${teamName(t)}. Tap to change` : `Pick ${p.name} for ${teamName(turn)}`}
                  onClick={() => tapTile(p)}
                >
                  <span className="sq-tile-name">{p.name}</span>
                  {t ? <small>{capName(t)}</small> : <Num n={p.jersey} />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <TeamColumns d={d} byId={byId} turn={done ? null : turn} onCaptain={setCapFor} onPlayer={setMenuFor} />

      <div className="sq-under">
        <span>Tap a player to move or remove.</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm sq-danger-link"
          onClick={() => setAsk({ danger: true, title: 'Start over?', desc: 'Captains and all picks will be cleared. The IN / OUT list stays.', yes: 'Start over', onYes: () => act('resetDraft', { matchId: match.id }) })}
        >
          Start over
        </button>
      </div>

      <ActionBar className="sq-bar-2">
        <button type="button" className="btn btn-secondary btn-md" disabled={!lastPick} onClick={() => act('undoPick', { matchId: match.id })}>
          <UndoIcon />
          <span className="sq-clip">{lastPick ? `Undo ${byId[lastPick.id]?.name}` : 'Undo'}</span>
        </button>
        <button
          type="button"
          className="btn btn-primary btn-md"
          disabled={!done}
          onClick={() => { act('setFinal', { matchId: match.id, final: true }); setStep('teams'); }}
        >
          {done ? <><CheckIcon /> Confirm teams</> : `${left} left to pick`}
        </button>
      </ActionBar>

      {capFor && <CaptainModal team={capFor} d={d} inPlayers={inPlayers} byId={byId} teamName={teamName} onClose={() => setCapFor(null)} onPick={(id) => { act('changeCaptain', { matchId: match.id, team: capFor, playerId: id }); setCapFor(null); }} />}
      {menuFor && teamOf(d, menuFor) && (
        <Modal onClose={() => setMenuFor(null)} labelledBy="pm-title" sheet>
          <ModalHead id="pm-title" title={byId[menuFor]?.name} sub={`In ${teamName(teamOf(d, menuFor))}`} onClose={() => setMenuFor(null)} />
          <div className="sq-menu">
            <button type="button" className="btn btn-secondary btn-md" onClick={() => { act('movePick', { matchId: match.id, playerId: menuFor }); setMenuFor(null); }}>
              <SwapIcon /> Move to {teamName(other(teamOf(d, menuFor)))}
            </button>
            <button type="button" className="btn btn-secondary btn-md" onClick={() => { act('removePick', { matchId: match.id, playerId: menuFor }); setMenuFor(null); }}>
              <ReturnIcon /> Back to available
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// Each team is headed by its captain; tap the captain to change them, a player to move them.
function TeamColumns({ d, byId, turn, onCaptain, onPlayer }) {
  return (
    <div className="sq-teams">
      {['A', 'B'].map(t => {
        const members = d.picks.filter(p => p.team === t);
        const cap = byId[d.captains[t]];
        return (
          <section key={t} className={`card sq-team team-${t} ${turn === t ? 'is-turn' : ''}`} aria-label={`Team ${cap?.name}, ${members.length + 1} players`}>
            <button type="button" className="sq-team-cap" aria-label={`Captain ${cap?.name}. Tap to change captain`} onClick={() => onCaptain(t)}>
              <span className="sq-team-capname">{cap?.name}</span>
              <span className="sq-c">C</span>
              <span className="sq-team-n num">{members.length + 1}</span>
              <PencilIcon />
            </button>
            <ol className="sq-team-list">
              {members.map(m => (
                <li key={m.id}>
                  {onPlayer ? (
                    <button type="button" className="sq-team-row" onClick={() => onPlayer(m.id)}>
                      <span>{byId[m.id]?.name}</span>
                      <DotsIcon />
                    </button>
                  ) : (
                    <span className="sq-team-row">
                      <span>{byId[m.id]?.name}</span>
                      <Num n={byId[m.id]?.jersey} />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function CaptainModal({ team, d, inPlayers, byId, teamName, onClose, onPick }) {
  const current = byId[d.captains[team]]?.name;
  const members = d.picks.filter(p => p.team === team).map(p => byId[p.id]).filter(Boolean);
  const pool = inPlayers.filter(p => !teamOf(d, p.id));
  const group = (title, note, list) => list.length > 0 && (
    <div>
      <p className="sq-group-label"><b>{title}</b> · {note}</p>
      <div className="sq-grid">
        {list.map(p => (
          <button key={p.id} type="button" className="sq-tile" onClick={() => onPick(p.id)}>
            <span className="sq-tile-name">{p.name}</span>
            <Num n={p.jersey} />
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <Modal onClose={onClose} labelledBy="cap-title" sheet>
      <ModalHead id="cap-title" title="Change captain" sub={`${teamName(team)} · tap the new captain`} onClose={onClose} />
      <div className="modal-body">
        {group('From this team', `swaps places with ${current}`, members)}
        {group('From available players', `${current} goes back to available`, pool)}
        {!members.length && !pool.length && <p className="sq-empty">No other players to choose from.</p>}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Step 3: final teams
// ---------------------------------------------------------------------------
function FinalTeams({ match, byId, act, setAsk, setFlash, teamName, setStep, inPlayers }) {
  const d = match.draft;
  const [capFor, setCapFor] = useState(null);
  const size = (t) => d.picks.filter(p => p.team === t).length + 1;

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
      <div className="sq-done" role="status">
        <CheckIcon />
        <span><b>Teams are set</b> · {size('A')} v {size('B')}</span>
      </div>

      <TeamColumns d={d} byId={byId} onCaptain={setCapFor} />

      <div className="sq-under">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { act('setFinal', { matchId: match.id, final: false }); setStep('pick'); }}>
          <PencilIcon /> Edit teams
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm sq-danger-link"
          onClick={() => setAsk({ danger: true, title: 'Delete teams?', desc: 'Captains and all picks will be cleared. The IN / OUT list stays.', yes: 'Delete teams', onYes: () => { act('resetDraft', { matchId: match.id }); setStep('pick'); } })}
        >
          <TrashIcon /> Delete teams
        </button>
      </div>

      <ActionBar className="sq-bar-share">
        <ShareButtons text={shareText} onCopied={setFlash} />
      </ActionBar>

      {capFor && <CaptainModal team={capFor} d={d} inPlayers={inPlayers} byId={byId} teamName={teamName} onClose={() => setCapFor(null)} onPick={(id) => { act('changeCaptain', { matchId: match.id, team: capFor, playerId: id }); setCapFor(null); }} />}
    </>
  );
}

function EditMatch({ match, onClose, onSave, onDelete }) {
  const [date, setDate] = useState(match.when.slice(0, 10));
  const [time, setTime] = useState(match.when.slice(11));
  const [title, setTitle] = useState(match.title);
  const when = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}/.test(time) ? `${date}T${time.slice(0, 5)}` : '';
  return (
    <Modal onClose={onClose} labelledBy="edit-match-title">
      <form onSubmit={(e) => { e.preventDefault(); if (when) onSave(when, title); }}>
        <ModalHead id="edit-match-title" title="Edit match" onClose={onClose} />
        <div className="modal-body">
          <div className="sq-form-row">
            <label className="field">
              <span className="field-label">Date</span>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </label>
            <label className="field">
              <span className="field-label">Time</span>
              <input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} required />
            </label>
          </div>
          <label className="field">
            <span className="field-label">Title (optional)</span>
            <input className="input" value={title} maxLength={NAME_MAX} onChange={e => setTitle(e.target.value)} autoComplete="off" />
          </label>
        </div>
        <div className="btn-grid btn-grid-2">
          <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-md" disabled={!when}>Save</button>
        </div>
        <button type="button" className="btn btn-ghost btn-sm btn-block sq-danger-link sq-mt-sm" onClick={onDelete}>
          <TrashIcon /> Delete match
        </button>
      </form>
    </Modal>
  );
}
