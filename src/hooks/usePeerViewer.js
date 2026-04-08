import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';

export const usePeerViewer = (hostPeerId) => {
  const peerRef = useRef(null);
  const [viewerState, setViewerState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hostPeerId) return;

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(hostPeerId, { reliable: true });

      conn.on('open', () => {
        setIsConnected(true);
        setError(null);
      });

      conn.on('data', (data) => {
        setViewerState(data);
      });

      conn.on('close', () => {
        setIsConnected(false);
        setError('Host disconnected');
      });

      conn.on('error', (err) => {
        setError(err.message);
        setIsConnected(false);
      });
    });

    peer.on('error', (err) => {
      setError(`Connection failed: ${err.message}`);
      setIsConnected(false);
    });

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [hostPeerId]);

  return { viewerState, isConnected, error };
};
