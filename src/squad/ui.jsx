import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { copyText } from './utils';

// Rendered into <body>: cards use backdrop-filter, which would otherwise trap and clip
// a position:fixed dialog inside the card it was opened from.
export const Modal = ({ onClose, children, labelledBy }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop sq-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal sq-modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>,
    document.body,
  );
};

// Small promise-free confirm: render <Confirm> when `ask` is set.
export const Confirm = ({ ask, onClose }) => {
  if (!ask) return null;
  return (
    <Modal onClose={onClose} labelledBy="confirm-title">
      <div className={`modal-icon ${ask.danger ? 'danger' : ''}`}>{ask.icon || (ask.danger ? '🗑️' : '❔')}</div>
      <h2 className="modal-title" id="confirm-title">{ask.title}</h2>
      {ask.desc && <p className="modal-desc">{ask.desc}</p>}
      <div className="btn-grid btn-grid-2">
        <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className={`btn btn-md ${ask.danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => { ask.onYes(); onClose(); }}
          autoFocus
        >
          {ask.yes || 'Confirm'}
        </button>
      </div>
    </Modal>
  );
};

export const Toast = ({ msg }) => (msg ? createPortal(<div className="sq-toast" role="status">{msg}</div>, document.body) : null);

export const Jersey = ({ n }) => <span className={`sq-jersey ${n ? '' : 'empty'}`}>{n || '–'}</span>;

export const ShareButtons = ({ text, onCopied }) => (
  <div className="sq-share">
    <a
      className="btn btn-sm sq-wa"
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      WhatsApp
    </a>
    <button type="button" className="btn btn-secondary btn-sm" onClick={async () => { await copyText(text); onCopied?.('Copied ✓'); }}>
      Copy
    </button>
  </div>
);

export const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
