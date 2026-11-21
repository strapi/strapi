import * as React from 'react';

interface UseDocumentActionConfirmOptions {
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
  isOpen: boolean | undefined;
}

const useDocumentActionConfirm = ({
  onConfirm,
  onClose,
  isOpen,
}: UseDocumentActionConfirmOptions) => {
  const status = React.useRef<'idle' | 'pending' | 'confirmed'>('idle');

  React.useEffect(() => {
    // Closing or reopening a dialog must not unlock an operation that is still pending.
    if (status.current !== 'pending') {
      status.current = 'idle';
    }
  }, [isOpen]);

  return async () => {
    if (!isOpen || status.current !== 'idle') {
      return;
    }

    status.current = 'pending';

    try {
      if (onConfirm) {
        await onConfirm();
      }
      // Keep success locked until the dialog closes, including its closing render.
      status.current = 'confirmed';
      onClose();
    } catch (error) {
      status.current = 'idle';
      throw error;
    }
  };
};

export { useDocumentActionConfirm };
