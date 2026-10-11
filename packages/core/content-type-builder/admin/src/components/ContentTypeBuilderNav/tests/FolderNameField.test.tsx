import { render, screen } from '@strapi/admin/strapi-admin/test';
import { createEvent, fireEvent } from '@testing-library/react';

import { FolderNameField } from '../components/FolderNav/FolderNameField';

describe.each(['create', 'rename'])('FolderNameField %s keyboard handling', (mode) => {
  const initialName = mode === 'rename' ? 'Existing' : 'New folder';

  function setup(validate?: (name: string) => string | undefined) {
    const onSubmit = jest.fn();
    const onCancel = jest.fn();
    render(
      <FolderNameField
        defaultValue={initialName}
        depth={0}
        onSubmit={onSubmit}
        onCancel={onCancel}
        validate={validate}
      />
    );
    const input = screen.getByRole('textbox', { name: 'Folder name' });
    return { input, onSubmit, onCancel };
  }

  test.each(['Enter', 'Process'])(
    'preserves composing %s, then accepts ordinary Enter once',
    (key) => {
      const { input, onSubmit, onCancel } = setup();
      fireEvent.change(input, { target: { value: '日本語' } });
      // 合成イベントによるハンドラ回帰試験。実 OS IME の再現ではない。
      const confirmation = createEvent.keyDown(input, { key, keyCode: 229, isComposing: true });
      fireEvent(input, confirmation);

      expect(confirmation.isTrusted).toBe(false);
      expect(confirmation.defaultPrevented).toBe(false);
      expect(onSubmit).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
      expect(input).toHaveValue('日本語');
      expect(input).toHaveFocus();

      fireEvent.keyDown(input, { key: 'Enter', keyCode: 13, isComposing: false });
      fireEvent.blur(input);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith('日本語');
      expect(onCancel).not.toHaveBeenCalled();
    }
  );

  test('preserves the initial name during IME confirmation, then accepts blur once', () => {
    const { input, onSubmit, onCancel } = setup();
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });
    expect(input).toHaveValue(initialName);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.blur(input);
    fireEvent.blur(input);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(initialName);
  });

  test('preserves Shift+Enter acceptance without duplicate blur acceptance', () => {
    const { input, onSubmit, onCancel } = setup();
    fireEvent.change(input, { target: { value: ' 日本語 ' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13, shiftKey: true });
    fireEvent.blur(input);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('日本語');
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('cancels on Escape after composition without acceptance on blur', () => {
    const { input, onSubmit, onCancel } = setup();
    fireEvent.change(input, { target: { value: '日本語' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });
    fireEvent.keyDown(input, { key: 'Escape', keyCode: 27 });
    fireEvent.blur(input);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('cancels an empty name once on ordinary Enter and blur', () => {
    const { input, onSubmit, onCancel } = setup();
    fireEvent.change(input, { target: { value: ' ' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
    fireEvent.blur(input);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('keeps an invalid name open on Enter and cancels once on blur', () => {
    const { input, onSubmit, onCancel } = setup(() => 'Invalid folder name');
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    fireEvent.blur(input);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
