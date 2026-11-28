// Live database (Supabase). The URL and publishable key are public by design:
// they only identify the project. All access is decided by the database's
// row level security, which lets signed-in admins in and nobody else.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://btrcinoapankuhshdtrn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nlFMoyV6T82Uxy_9mZHa6g_xfm4VuZW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'woyce-squad-auth' },
});

const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// Returns the raw app shape; the caller validates it with sanitize().
export async function fetchAll() {
  const [players, matches] = await Promise.all([
    supabase.from('players').select('id,name,jersey').order('created_at').then(check),
    supabase.from('matches').select('id,match_at,title,status,draft').then(check),
  ]);
  return {
    players,
    matches: matches.map(m => ({ id: m.id, when: m.match_at, title: m.title, status: m.status, draft: m.draft })),
  };
}

const rowsById = (list) => new Map(list.map(r => [r.id, JSON.stringify(r)]));

// What changed between the last saved state and the current one.
export function diff(prev, next) {
  const part = (a, b) => {
    const before = rowsById(a);
    const after = rowsById(b);
    return {
      upsert: b.filter(r => before.get(r.id) !== after.get(r.id)),
      remove: a.filter(r => !after.has(r.id)).map(r => r.id),
    };
  };
  const players = part(prev.players, next.players);
  const matches = part(prev.matches, next.matches);
  const count = players.upsert.length + players.remove.length + matches.upsert.length + matches.remove.length;
  return count ? { players, matches } : null;
}

export async function push({ players, matches }) {
  if (players.upsert.length) {
    check(await supabase.from('players').upsert(players.upsert.map(p => ({ id: p.id, name: p.name, jersey: p.jersey }))));
  }
  if (matches.upsert.length) {
    check(await supabase.from('matches').upsert(matches.upsert.map(m => ({
      id: m.id, match_at: m.when, title: m.title, status: m.status, draft: m.draft, updated_at: new Date().toISOString(),
    }))));
  }
  if (matches.remove.length) check(await supabase.from('matches').delete().in('id', matches.remove));
  if (players.remove.length) check(await supabase.from('players').delete().in('id', players.remove));
}
