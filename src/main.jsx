import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swBase = import.meta.env.BASE_URL || '/';
    navigator.serviceWorker.register(`${swBase}sw.js`).catch(() => {});
  });
}
