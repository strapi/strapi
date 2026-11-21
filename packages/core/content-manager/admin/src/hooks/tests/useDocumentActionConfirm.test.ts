import { renderHook } from '@tests/utils';

import { useDocumentActionConfirm } from '../useDocumentActionConfirm';

const deferredConfirmation = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
};

describe('useDocumentActionConfirm', () => {
  it('confirms once and closes after a successful action', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useDocumentActionConfirm({ onConfirm, onClose, isOpen: true })
    );

    await result.current();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores synchronous repeated confirmations before a rerender', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useDocumentActionConfirm({ onConfirm, onClose, isOpen: true })
    );

    const firstConfirmation = result.current();
    const secondConfirmation = result.current();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await Promise.all([firstConfirmation, secondConfirmation]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores further confirmations while the operation remains pending', async () => {
    const operation = deferredConfirmation();
    const onConfirm = jest.fn(() => operation.promise);
    const onClose = jest.fn();
    const { result, rerender } = renderHook(() =>
      useDocumentActionConfirm({ onConfirm, onClose, isOpen: true })
    );

    const confirmation = result.current();
    rerender();
    const duplicateConfirmation = result.current();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    operation.resolve();
    await Promise.all([confirmation, duplicateConfirmation]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('preserves a rejection, keeps the dialog open, and allows a retry', async () => {
    const operation = deferredConfirmation();
    const error = new Error('Confirmation failed');
    const onConfirm = jest
      .fn()
      .mockImplementationOnce(() => operation.promise)
      .mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useDocumentActionConfirm({ onConfirm, onClose, isOpen: true })
    );

    const confirmation = result.current();
    operation.reject(error);
    await expect(confirmation).rejects.toBe(error);
    expect(onClose).not.toHaveBeenCalled();

    await result.current();
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps a successful confirmation locked until the dialog closes', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useDocumentActionConfirm({ onConfirm, onClose, isOpen: true })
    );

    await result.current();
    await result.current();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows another confirmation after closing and reopening the dialog', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDocumentActionConfirm({ onConfirm, onClose, isOpen }),
      { initialProps: { isOpen: true } }
    );

    await result.current();
    rerender({ isOpen: false });
    await result.current();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    rerender({ isOpen: true });
    await result.current();

    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not unlock pending work when the dialog is closed and reopened', async () => {
    const operation = deferredConfirmation();
    const onConfirm = jest.fn(() => operation.promise);
    const onClose = jest.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDocumentActionConfirm({ onConfirm, onClose, isOpen }),
      { initialProps: { isOpen: true } }
    );

    const confirmation = result.current();
    rerender({ isOpen: false });
    rerender({ isOpen: true });
    const duplicateConfirmation = result.current();
    expect(onConfirm).toHaveBeenCalledTimes(1);

    operation.resolve();
    await Promise.all([confirmation, duplicateConfirmation]);
    rerender({ isOpen: false });
    rerender({ isOpen: true });
    await result.current();
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });
});
