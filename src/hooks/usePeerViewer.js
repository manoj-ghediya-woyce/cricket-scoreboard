import { useEffect, useState } from 'react';
import Peer from 'peerjs';

const PING_MS = 5000;           // tell the host we're still watching
const SILENCE_MS = 15000;       // host sends at least every 5s; silence = dead link
const OPEN_TIMEOUT_MS = 15000;  // give up on a connect attempt that never opens
const MAX_RETRY_MS = 10000;

// Same id across reconnects in this tab, so the host can drop our old link
const getViewerId = () => {
  try {
    let id = sessionStorage.getItem('liveViewerId');
    if (!id) {
      id = Math.random().toString(36).slice(2, 12);
      sessionStorage.setItem('liveViewerId', id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2, 12);
  }
};

export const usePeerViewer = (hostPeerId) => {
  const [viewerState, setViewerState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hostPeerId) return;

    const viewerId = getViewerId();
    let disposed = false;
    let peer = null;
    let conn = null;
    let live = false;
    let lastData = 0;
    let attempt = 0;
    let retryTimer = null;
    let openTimer = null;
    let pingTimer = null;
    let watchdog = null;

    const teardown = () => {
      clearTimeout(openTimer);
      clearInterval(pingTimer);
      clearInterval(watchdog);
      live = false;
      conn = null;
      if (peer) {
        const p = peer;
        peer = null;
        p.destroy();
      }
    };

    // Keep the last score on screen and quietly keep trying to get back in
    const scheduleRetry = (message) => {
      if (disposed) return;
      teardown();
      setIsConnected(false);
      setError(message);
      clearTimeout(retryTimer);
      const delay = Math.min(MAX_RETRY_MS, 1000 * 2 ** attempt);
      attempt += 1;
      retryTimer = setTimeout(connect, delay);
    };

    function connect() {
      if (disposed) return;
      clearTimeout(retryTimer);
      teardown();

      const p = new Peer();
      peer = p;
      openTimer = setTimeout(() => {
        if (peer === p && !live) scheduleRetry('Host is offline');
      }, OPEN_TIMEOUT_MS);

      p.on('open', () => {
        if (peer !== p) return;
        const c = p.connect(hostPeerId, { reliable: true, metadata: { viewerId } });
        conn = c;

        c.on('open', () => {
          if (conn !== c) return;
          clearTimeout(openTimer);
          live = true;
          attempt = 0;
          lastData = Date.now();
          setIsConnected(true);
          setError(null);
          pingTimer = setInterval(() => {
            try { if (c.open) c.send({ type: 'ping' }); } catch { /* handled by watchdog */ }
          }, PING_MS);
          watchdog = setInterval(() => {
            if (conn === c && Date.now() - lastData > SILENCE_MS) scheduleRetry('Lost connection to host');
          }, 3000);
        });

        c.on('data', (data) => {
          if (conn !== c) return;
          lastData = Date.now();
          if (data && typeof data === 'object' && data.type === 'ping') return;
          setViewerState(data);
        });

        c.on('close', () => {
          if (conn === c) scheduleRetry('Host went offline');
        });

        c.on('error', () => {
          if (conn === c) scheduleRetry('Connection error');
        });
      });

      // Lost the signalling server; the data link may still be fine
      p.on('disconnected', () => {
        if (peer === p && !p.destroyed) {
          try { p.reconnect(); } catch { /* watchdog will recover */ }
        }
      });

      p.on('error', (err) => {
        if (peer !== p) return;
        scheduleRetry(err.type === 'peer-unavailable' ? 'Host is offline' : 'Connection problem');
      });
    }

    // Back from another app/tab, or network returned: check the link at once
    const revive = () => {
      if (disposed || document.visibilityState !== 'visible') return;
      if (!live || Date.now() - lastData > SILENCE_MS) {
        attempt = 0;
        connect();
      }
    };

    connect();
    document.addEventListener('visibilitychange', revive);
    window.addEventListener('online', revive);
    window.addEventListener('pageshow', revive);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      teardown();
      document.removeEventListener('visibilitychange', revive);
      window.removeEventListener('online', revive);
      window.removeEventListener('pageshow', revive);
    };
  }, [hostPeerId]);

  return { viewerState, isConnected, error };
};
