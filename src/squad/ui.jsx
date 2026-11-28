import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { copyText } from './utils';

// One icon style everywhere (same stroke look as the app header), instead of
// text symbols and emoji that every phone draws differently.
const Svg = ({ children }) => <svg className="sq-ico" viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
export const BackIcon = () => <Svg><path d="M15 5l-7 7 7 7" /></Svg>;
export const NextIcon = () => <Svg><path d="M9 5l7 7-7 7" /></Svg>;
export const PencilIcon = () => <Svg><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" /></Svg>;
const Dot = ({ x, y }) => <circle cx={x} cy={y} r="1.5" fill="currentColor" stroke="none" />;
export const DotsIcon = () => <Svg><Dot x={5} y={12} /><Dot x={12} y={12} /><Dot x={19} y={12} /></Svg>;
export const UndoIcon = () => <Svg><path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></Svg>;
export const CheckIcon = () => <Svg><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const SwapIcon = () => <Svg><path d="M7 4L3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7" /></Svg>;
export const ReturnIcon = () => <Svg><path d="M9 14L4 9l5-5M4 9h9a7 7 0 0 1 7 7v3" /></Svg>;
export const CloseIcon = () => <Svg><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const CopyIcon = () => <Svg><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Svg>;
export const DiceIcon = () => <Svg><rect x="4" y="4" width="16" height="16" rx="3.5" /><Dot x={9} y={9} /><Dot x={15} y={9} /><Dot x={12} y={12} /><Dot x={9} y={15} /><Dot x={15} y={15} /></Svg>;
export const TrashIcon = () => <Svg><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>;

// Rendered into <body>, so a dialog is never trapped or clipped by the card it was opened from.
// `sheet` dialogs (menus and confirmations, no typing) open from the bottom on phones, next to
// the thumb; dialogs with text fields stay near the top so the keyboard never covers them.
export const Modal = ({ onClose, children, labelledBy, sheet = false }) => {
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
    <div className={`modal-backdrop sq-modal-backdrop ${sheet ? 'is-sheet' : ''}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal sq-modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>,
    document.body,
  );
};

export const ModalHead = ({ id, title, sub, onClose }) => (
  <div className="sq-modal-head">
    <div>
      <h2 className="modal-title" id={id}>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
    <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><CloseIcon /></button>
  </div>
);

// Small promise-free confirm: render <Confirm> when `ask` is set.
export const Confirm = ({ ask, onClose }) => {
  if (!ask) return null;
  return (
    <Modal onClose={onClose} labelledBy="confirm-title" sheet>
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

// Jersey number: quiet text after the name, and nothing at all when a player has no number.
export const Num = ({ n }) => (n ? <span className="sq-num">{n}</span> : null);

// The main action(s) of a step, kept at the bottom of the screen within thumb reach.
export const ActionBar = ({ className = '', children }) => <div className={`sq-bar ${className}`}>{children}</div>;

export const ShareButtons = ({ text, onCopied }) => (
  <>
    <a className="btn btn-md sq-wa" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
      WhatsApp
    </a>
    <button type="button" className="btn btn-secondary btn-md" aria-label="Copy the text" onClick={async () => { await copyText(text); onCopied?.('Copied'); }}>
      <CopyIcon /><span>Copy</span>
    </button>
  </>
);
