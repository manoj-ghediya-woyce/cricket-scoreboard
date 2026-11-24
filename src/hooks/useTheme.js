import { useCallback, useEffect, useState } from 'react';

// 'system' follows the OS setting; 'light' / 'dark' are explicit overrides.
const MODES = ['system', 'light', 'dark'];

const readSaved = () => {
  try {
    const t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
};

export const useTheme = () => {
  const [mode, setMode] = useState(readSaved);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    try {
      if (mode === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', mode);
    } catch {
      // storage unavailable (private mode) — theme still applies for this visit
    }
  }, [mode]);

  const cycle = useCallback(() => {
    setMode(m => MODES[(MODES.indexOf(m) + 1) % MODES.length]);
  }, []);

  return { mode, setMode, cycle };
};
