import { useEffect, useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');

const parseWhen = (when) => {
  const [d, t] = when.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [h, min] = t.split(':').map(Number);
  return new Date(y, m - 1, day, h, min);
};

export const whenTime = (when) => parseWhen(when).getTime();

export const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const TIME = { hour: 'numeric', minute: '2-digit' };

export const formatTime = (when) => parseWhen(when).toLocaleTimeString(undefined, TIME);

export const formatWhen = (when, { short = false } = {}) => {
  const dt = parseWhen(when);
  const date = dt.toLocaleDateString(undefined, short
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return `${date} · ${dt.toLocaleTimeString(undefined, TIME)}`;
};

// Whole days from today to the match day: 0 = today, 1 = tomorrow, negative = past.
export const daysAway = (when) => {
  const d = parseWhen(when);
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - from) / 864e5);
};

// "Today", "Tomorrow", "Yesterday", otherwise the short weekday.
export const dayWord = (when) => {
  const n = daysAway(when);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return parseWhen(when).toLocaleDateString(undefined, { weekday: 'short' });
};

// Month and day for the small calendar tile; the year only when it is not this year.
export const calendarParts = (when) => {
  const dt = parseWhen(when);
  return {
    month: dt.toLocaleDateString(undefined, { month: 'short' }),
    day: dt.getDate(),
    year: dt.getFullYear() === new Date().getFullYear() ? '' : String(dt.getFullYear()),
  };
};

// The next `count` days starting from `today` (a YYYY-MM-DD string), for the day picker.
export const nextDays = (count, today) => {
  const [y, m, d] = today.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);
    return { value: dateStr(dt), day: dt.getDate(), label: i === 0 ? 'Today' : dt.toLocaleDateString(undefined, { weekday: 'short' }) };
  });
};

// Today's date, kept fresh when the page comes back into view (e.g. left open overnight).
export const useToday = () => {
  const [today, setToday] = useState(() => dateStr(new Date()));
  useEffect(() => {
    const on = () => setToday(dateStr(new Date()));
    document.addEventListener('visibilitychange', on);
    window.addEventListener('focus', on);
    return () => {
      document.removeEventListener('visibilitychange', on);
      window.removeEventListener('focus', on);
    };
  }, []);
  return today;
};

export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
};

export const useFlash = () => {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(''), 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, setMsg];
};
