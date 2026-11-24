import { useEffect } from 'react';
import { useCricket } from './useCricket';

export const useKeyboardShortcuts = (enabled = true) => {
  const { actions } = useCricket();

  useEffect(() => {
    if (!enabled) return;
    const handleKeyPress = (event) => {
      // Ignore browser/OS shortcuts (Cmd+1, Ctrl+W, Ctrl+U…) and held-down keys
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      // Only handle if not typing in an editable field
      const target = event.target;
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) return;

      switch (event.key) {
        case '0':
          actions.addRuns(0);
          break;
        case '1':
          actions.addRuns(1);
          break;
        case '2':
          actions.addRuns(2);
          break;
        case '3':
          actions.addRuns(3);
          break;
        case '4':
          actions.addRuns(4);
          break;
        case '6':
          actions.addRuns(6);
          break;
        case 'w':
        case 'W':
          actions.addWicket();
          break;
        case 'u':
        case 'U':
          actions.undo();
          break;
        case 'Escape':
          // Could be used to close modals
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [actions, enabled]);
};