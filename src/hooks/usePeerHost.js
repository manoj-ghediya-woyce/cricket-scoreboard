import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';

export const usePeerHost = (state) => {
  const peerRef = useRef(null);
  const connectionsRef = useRef([]);
  const stateRef = useRef(state);
  const [peerId, setPeerId] = useState(null);
  const [isHosting, setIsHosting] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [error, setError] = useState(null);

  // Keep stateRef current so new connections get the latest state
  useEffect(() => {
    stateRef.current = state;
  });

  const broadcast = useCallback((data) => {
    const openConns = connectionsRef.current.filter(conn => conn.open);
    connectionsRef.current = openConns;
    // Strip history to keep messages small
    const payload = { ...data, history: [] };
    openConns.forEach(conn => {
      try {
        conn.send(payload);
      } catch (e) {
        console.error('PeerJS send error:', e);
      }
    });
    setConnectionCount(openConns.length);
  }, []);

  // Broadcast on every state change while hosting
  useEffect(() => {
    if (isHosting && peerId) {
      broadcast(state);
    }
  }, [state, isHosting, peerId, broadcast]);

  const startHosting = useCallback(() => {
    if (peerRef.current) return;

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      setIsHosting(true);
      setError(null);
    });

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        connectionsRef.current.push(conn);
        setConnectionCount(connectionsRef.current.filter(c => c.open).length);
        // Send current state to the new viewer immediately
        conn.send({ ...stateRef.current, history: [] });
      });

      conn.on('close', () => {
        connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
        setConnectionCount(connectionsRef.current.filter(c => c.open).length);
      });
    });

    peer.on('error', (err) => {
      setError(err.message);
      setIsHosting(false);
    });
  }, []);

  const stopHosting = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    connectionsRef.current = [];
    setPeerId(null);
    setIsHosting(false);
    setConnectionCount(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  const shareUrl = peerId
    ? `${window.location.origin}${window.location.pathname}?peer=${peerId}`
    : null;

  return { peerId, shareUrl, isHosting, startHosting, stopHosting, connectionCount, error };
};
