import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  // When a newly deployed worker takes over an already-controlled page, reload once
  // so the visitor sees the new version instead of the previously cached one.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    const swBase = import.meta.env.BASE_URL || '/';
    navigator.serviceWorker.register(`${swBase}sw.js`).catch(() => {});
  });
}
