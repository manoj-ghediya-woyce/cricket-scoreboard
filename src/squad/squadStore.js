// Squad + match-day store. Everything lives on the admin's device (localStorage),
// so there is no server, no public endpoint and nothing for anyone else to tamper with.
// Every value read from storage or an imported backup goes through sanitize() first.
import { useCallback, useEffect, useReducer } from 'react';

const STORAGE_KEY = 'woyce-squad-v1';
export const NAME_MAX = 30;
// Type-checked tests: never coerce unknown values (a crafted object could throw).
const str = (v) => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
const isId = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v);
const isWhen = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v);
const JERSEY_RE = /^\d{1,3}$/;

export const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');

export const cleanName = (s) => str(s).replace(/\p{Cc}/gu, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
export const cleanJersey = (s) => {
  const v = str(s).trim();
  return JERSEY_RE.test(v) ? String(parseInt(v, 10)) : '';
};

const EMPTY = { players: [], matches: [] };

const emptyDraft = () => ({ captains: { A: null, B: null }, first: 'A', picks: [], final: false });

// ---------------------------------------------------------------------------
// Validation: anything malformed is dropped rather than trusted.
// ---------------------------------------------------------------------------
export function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const seen = new Set();
  const players = (Array.isArray(raw.players) ? raw.players : [])
    .filter(p => p && isId(p.id) && !seen.has(p.id) && seen.add(p.id))
    .map(p => ({ id: p.id, name: cleanName(p.name), jersey: cleanJersey(p.jersey) }))
    .filter(p => p.name)
    .slice(0, 200);
  const ids = new Set(players.map(p => p.id));
  const isTeam = (t) => t === 'A' || t === 'B';

  const matches = (Array.isArray(raw.matches) ? raw.matches : [])
    .filter(m => m && isId(m.id) && isWhen(m.when))
    .slice(0, 300)
    .map(m => {
      const status = {};
      if (m.status && typeof m.status === 'object') {
        for (const [pid, s] of Object.entries(m.status)) {
          if (ids.has(pid) && (s === 'in' || s === 'out')) status[pid] = s;
        }
      }
      const d = m.draft && typeof m.draft === 'object' ? m.draft : {};
      const capA = ids.has(d.captains?.A) && status[d.captains.A] === 'in' ? d.captains.A : null;
      const capB = ids.has(d.captains?.B) && status[d.captains.B] === 'in' && d.captains.B !== capA ? d.captains.B : null;
      const used = new Set([capA, capB]);
      const picks = capA && capB
        ? (Array.isArray(d.picks) ? d.picks : [])
          .filter(p => p && ids.has(p.id) && status[p.id] === 'in' && isTeam(p.team) && !used.has(p.id) && used.add(p.id))
          .map(p => ({ id: p.id, team: p.team }))
        : [];
      return {
        id: m.id,
        when: m.when,
        title: cleanName(m.title),
        status,
        draft: {
          captains: capA && capB ? { A: capA, B: capB } : { A: null, B: null },
          first: isTeam(d.first) ? d.first : 'A',
          picks,
          // Teams stay "final" only while every IN player is in a team.
          final: Boolean(capA && capB && d.final)
            && Object.entries(status).every(([pid, s]) => s !== 'in' || used.has(pid)),
        },
      };
    });
  return { players, matches };
}

function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    return sanitize(JSON.parse(raw || 'null'));
  } catch {
    // Never silently wipe the squad: park unreadable data so it can be recovered.
    try { if (raw) localStorage.setItem(`${STORAGE_KEY}-unreadable-${Date.now()}`, raw); } catch { /* ignore */ }
    return EMPTY;
  }
}

// ---------------------------------------------------------------------------
// Draft helpers
// ---------------------------------------------------------------------------
export const other = (t) => (t === 'A' ? 'B' : 'A');

// Captains alternate one pick at a time. If an edit (move / remove) left the teams
// uneven, the smaller team picks next until they're level again.
export const nextTurn = (draft) => {
  const a = draft.picks.filter(p => p.team === 'A').length;
  const b = draft.picks.length - a;
  if (a !== b) return a < b ? 'A' : 'B';
  return draft.picks.length ? other(draft.picks[draft.picks.length - 1].team) : draft.first;
};

export const teamOf = (draft, pid) => {
  if (draft.captains.A === pid) return 'A';
  if (draft.captains.B === pid) return 'B';
  return draft.picks.find(p => p.id === pid)?.team ?? null;
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
const mapMatch = (state, id, fn) => ({
  ...state,
  matches: state.matches.map(m => (m.id === id ? fn(m) : m)),
});
const mapDraft = (state, id, fn) => mapMatch(state, id, m => ({ ...m, draft: fn(m.draft, m) }));

function reducer(state, a) {
  switch (a.type) {
    case 'replace':
      return sanitize(a.data);

    case 'addPlayer': {
      const name = cleanName(a.name);
      if (!name) return state;
      return { ...state, players: [...state.players, { id: newId(), name, jersey: cleanJersey(a.jersey) }] };
    }
    case 'updatePlayer': {
      const name = cleanName(a.name);
      if (!name) return state;
      return { ...state, players: state.players.map(p => (p.id === a.id ? { ...p, name, jersey: cleanJersey(a.jersey) } : p)) };
    }
    case 'deletePlayer':
      // sanitize() drops every reference to the removed player from all matches.
      return sanitize({ ...state, players: state.players.filter(p => p.id !== a.id) });

    case 'addMatch':
      if (!isWhen(a.when)) return state;
      return {
        ...state,
        matches: [...state.matches, { id: newId(), when: a.when, title: cleanName(a.title), status: {}, draft: emptyDraft() }],
      };
    case 'updateMatch':
      if (!isWhen(a.when)) return state;
      return mapMatch(state, a.id, m => ({ ...m, when: a.when, title: cleanName(a.title) }));
    case 'deleteMatch':
      return { ...state, matches: state.matches.filter(m => m.id !== a.id) };

    case 'setStatus':
      return sanitize(mapMatch(state, a.matchId, m => {
        const status = { ...m.status };
        if (a.status === 'in' || a.status === 'out') status[a.playerId] = a.status;
        else delete status[a.playerId];
        return { ...m, status };
      }));
    case 'setAllPending':
      return sanitize(mapMatch(state, a.matchId, m => {
        const status = { ...m.status };
        for (const p of state.players) if (!status[p.id]) status[p.id] = a.status;
        return { ...m, status };
      }));

    case 'startDraft':
      return sanitize(mapDraft(state, a.matchId, () => ({
        captains: { A: a.A, B: a.B }, first: a.first, picks: [], final: false,
      })));
    case 'pick':
      return mapDraft(state, a.matchId, (d, m) => {
        if (d.final || m.status[a.playerId] !== 'in' || teamOf(d, a.playerId)) return d;
        return { ...d, picks: [...d.picks, { id: a.playerId, team: nextTurn(d) }] };
      });
    case 'undoPick':
      return mapDraft(state, a.matchId, d => ({ ...d, picks: d.picks.slice(0, -1), final: false }));
    case 'removePick':
      return mapDraft(state, a.matchId, d => ({ ...d, picks: d.picks.filter(p => p.id !== a.playerId) }));
    case 'movePick':
      return mapDraft(state, a.matchId, d => ({
        ...d, picks: d.picks.map(p => (p.id === a.playerId ? { ...p, team: other(p.team) } : p)),
      }));
    case 'changeCaptain':
      return mapDraft(state, a.matchId, (d, m) => {
        const t = a.team;
        const old = d.captains[t];
        const np = a.playerId;
        if (!old || np === old || np === d.captains[other(t)] || m.status[np] !== 'in') return d;
        const fromTeam = d.picks.find(p => p.id === np);
        if (fromTeam && fromTeam.team !== t) return d;
        // Swap within the team: the old captain takes the new captain's pick slot.
        // Picked from the pool instead: the old captain goes back to the pool.
        const picks = fromTeam
          ? d.picks.map(p => (p.id === np ? { id: old, team: t } : p))
          : d.picks;
        return { ...d, captains: { ...d.captains, [t]: np }, picks };
      });
    case 'setFinal':
      return sanitize(mapDraft(state, a.matchId, d => ({ ...d, final: Boolean(a.final) })));
    case 'resetDraft':
      return mapDraft(state, a.matchId, () => emptyDraft());
    default:
      return state;
  }
}

export function useSquadStore() {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked (private mode): the app keeps working in memory.
    }
  }, [state]);

  // Keep two open tabs in step.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try { dispatch({ type: 'replace', data: JSON.parse(e.newValue) }); } catch { /* ignore bad data */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const act = useCallback((type, payload = {}) => dispatch({ type, ...payload }), []);
  return { state, act };
}
