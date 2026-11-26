import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';

// The host keeps ONE peer ID for good, so the shared link survives tab closes,
// reloads and the phone putting the app in the background.
const HOST_ID_KEY = 'liveHostPeerId';
// Remembers that hosting was on, so reopening the app resumes it automatically.
const HOST_ACTIVE_KEY = 'liveHostActive';

const HEARTBEAT_MS = 5000;       // re-send state so viewers know we're alive
const VIEWER_TIMEOUT_MS = 20000; // drop viewers we haven't heard from
const MAX_RETRY_MS = 15000;

// Errors that retrying can't fix
const FATAL_ERRORS = new Set(['browser-incompatible', 'invalid-id', 'invalid-key', 'ssl-unavailable']);

const storage = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  remove: (k) => { try { localStorage.removeItem(k); } catch { /* private mode */ } },
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  }
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
};

const getHostId = () => {
  let id = storage.get(HOST_ID_KEY);
  if (!id) {
    id = `woyce-${randomId()}`;
    storage.set(HOST_ID_KEY, id);
  }
  return id;
};

export const usePeerHost = (state) => {
  const peerRef = useRef(null);
  const connectionsRef = useRef([]);
  const stateRef = useRef(state);
  const wantHostingRef = useRef(false);
  const retryTimerRef = useRef(null);
  const attemptRef = useRef(0);
  const connectRef = useRef(() => {});

  const [peerId, setPeerId] = useState(null);
  const [isHosting, setIsHosting] = useState(false);
  // 'connecting' (first start) | 'live' | 'reconnecting'
  const [status, setStatus] = useState('connecting');
  const [connectionCount, setConnectionCount] = useState(0);
  const [error, setError] = useState(null);

  // Keep stateRef current so new connections get the latest state
  useEffect(() => {
    stateRef.current = state;
  });

  const refreshCount = useCallback(() => {
    setConnectionCount(connectionsRef.current.filter(c => c.open).length);
  }, []);

  const broadcast = useCallback((data) => {
    const now = Date.now();
    connectionsRef.current = connectionsRef.current.filter(conn => {
      // Only viewers that ping can be judged stale (older viewer builds don't)
      const stale = !!conn._lastSeen && now - conn._lastSeen > VIEWER_TIMEOUT_MS;
      if (!conn.open || stale) {
        try { conn.close(); } catch { /* already gone */ }
        return false;
      }
      return true;
    });
    // Strip history to keep messages small
    const payload = { ...data, history: [] };
    connectionsRef.current.forEach(conn => {
      try {
        conn.send(payload);
      } catch (e) {
        console.error('PeerJS send error:', e);
      }
    });
    setConnectionCount(connectionsRef.current.length);
  }, []);

  const clearRetry = () => {
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  };

  const scheduleRetry = useCallback(() => {
    if (!wantHostingRef.current) return;
    clearTimeout(retryTimerRef.current);
    const delay = Math.min(MAX_RETRY_MS, 1000 * 2 ** attemptRef.current);
    attemptRef.current += 1;
    retryTimerRef.current = setTimeout(() => connectRef.current(), delay);
  }, []);

  const connect = useCallback(() => {
    if (!wantHostingRef.current) return;
    clearRetry();

    const old = peerRef.current;
    peerRef.current = null;
    if (old && !old.destroyed) old.destroy();
    connectionsRef.current = [];
    setConnectionCount(0);

    const id = getHostId();
    setPeerId(id);
    const peer = new Peer(id);
    peerRef.current = peer;

    peer.on('open', () => {
      if (peerRef.current !== peer) return;
      attemptRef.current = 0;
      setStatus('live');
      setError(null);
    });

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        if (peerRef.current !== peer) return;
        // A viewer that reconnects replaces its old (possibly dead) connection
        const viewerId = conn.metadata && conn.metadata.viewerId;
        if (viewerId) {
          connectionsRef.current = connectionsRef.current.filter(c => {
            if (c.metadata && c.metadata.viewerId === viewerId) {
              try { c.close(); } catch { /* already gone */ }
              return false;
            }
            return true;
          });
        }
        connectionsRef.current.push(conn);
        refreshCount();
        // Send current state to the new viewer immediately
        conn.send({ ...stateRef.current, history: [] });
      });

      // Viewers ping us; anything they send proves they're still there
      conn.on('data', () => {
        conn._lastSeen = Date.now();
      });

      conn.on('close', () => {
        connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
        refreshCount();
      });

      conn.on('error', () => {
        connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
        refreshCount();
      });
    });

    // Lost the signalling server (common when the phone backgrounds the app).
    // Existing viewers may keep working; try to get back on the server.
    peer.on('disconnected', () => {
      if (peerRef.current !== peer || peer.destroyed) return;
      setStatus('reconnecting');
      try {
        peer.reconnect();
      } catch {
        scheduleRetry();
      }
    });

    peer.on('error', (err) => {
      if (peerRef.current !== peer) return;
      // A single viewer link problem isn't a hosting failure
      if (err.type === 'peer-unavailable') return;

      if (FATAL_ERRORS.has(err.type)) {
        wantHostingRef.current = false;
        storage.remove(HOST_ACTIVE_KEY);
        peer.destroy();
        peerRef.current = null;
        connectionsRef.current = [];
        setConnectionCount(0);
        setIsHosting(false);
        setError(err.message);
        return;
      }

      // Network drop, server hiccup, or our ID still held by the previous
      // session ('unavailable-id'): keep the same ID and try again shortly.
      peer.destroy();
      peerRef.current = null;
      setStatus('reconnecting');
      scheduleRetry();
    });
  }, [refreshCount, scheduleRetry]);

  connectRef.current = connect;

  const startHosting = useCallback(() => {
    if (wantHostingRef.current) return;
    wantHostingRef.current = true;
    attemptRef.current = 0;
    storage.set(HOST_ACTIVE_KEY, '1');
    setIsHosting(true);
    setStatus('connecting');
    setError(null);
    connect();
  }, [connect]);

  const stopHosting = useCallback(() => {
    wantHostingRef.current = false;
    storage.remove(HOST_ACTIVE_KEY);
    clearRetry();
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    connectionsRef.current = [];
    setPeerId(null);
    setIsHosting(false);
    setConnectionCount(0);
    setError(null);
  }, []);

  // Resume hosting automatically if it was on when the tab was closed/reloaded
  useEffect(() => {
    if (storage.get(HOST_ACTIVE_KEY) === '1') startHosting();
  }, [startHosting]);

  // Broadcast on every state change while hosting
  useEffect(() => {
    if (isHosting && status === 'live') {
      broadcast(state);
    }
  }, [state, isHosting, status, broadcast]);

  // Heartbeat: viewers treat silence as a dead link and reconnect
  useEffect(() => {
    if (!isHosting) return;
    const t = setInterval(() => broadcast(stateRef.current), HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [isHosting, broadcast]);

  // Coming back to the app / network: revive the peer right away
  useEffect(() => {
    if (!isHosting) return;
    const revive = () => {
      if (!wantHostingRef.current || document.visibilityState !== 'visible') return;
      const peer = peerRef.current;
      if (!peer || peer.destroyed) {
        attemptRef.current = 0;
        connectRef.current();
      } else if (peer.disconnected) {
        try {
          peer.reconnect();
        } catch {
          connectRef.current();
        }
      } else {
        broadcast(stateRef.current);
      }
    };
    document.addEventListener('visibilitychange', revive);
    window.addEventListener('online', revive);
    window.addEventListener('pageshow', revive);
    return () => {
      document.removeEventListener('visibilitychange', revive);
      window.removeEventListener('online', revive);
      window.removeEventListener('pageshow', revive);
    };
  }, [isHosting, broadcast]);

  // Keep the scorer's screen awake while live so the phone doesn't sleep
  useEffect(() => {
    if (!isHosting || !('wakeLock' in navigator)) return;
    let lock = null;
    let active = true;
    const acquire = async () => {
      if (!active || document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Not allowed (battery saver, unsupported) — hosting still works
      }
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', acquire);
      if (lock && !lock.released) lock.release().catch(() => {});
    };
  }, [isHosting]);

  // Cleanup on unmount (keeps the "active" flag so a reopen resumes hosting)
  useEffect(() => {
    return () => {
      wantHostingRef.current = false;
      clearTimeout(retryTimerRef.current);
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  const shareUrl = peerId
    ? `${window.location.origin}${window.location.pathname}?peer=${peerId}`
    : null;

  return { peerId, shareUrl, isHosting, status, startHosting, stopHosting, connectionCount, error };
};
