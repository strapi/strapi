import { useState } from 'react';

import { render, screen } from '@strapi/admin/strapi-admin/test';
import { createEvent, fireEvent } from '@testing-library/react';

import { ResizableTextArea } from '../components/ResizableTextArea';

function setup({ initialValue = '日本語', clearOnSubmit = false, withSubmit = true } = {}) {
  const onSubmit = jest.fn();
  const Fixture = () => {
    const [value, setValue] = useState(initialValue);
    return (
      <ResizableTextArea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onSubmit={
          withSubmit
            ? () => {
                onSubmit(value);
                if (clearOnSubmit) {
                  setValue('');
                }
              }
            : undefined
        }
        placeholder="IME regression input"
      />
    );
  };
  render(<Fixture />);
  return { input: screen.getByRole('textbox'), onSubmit };
}

describe('ResizableTextArea keyboard handling', () => {
  test.each([
    { key: 'Enter', keyCode: 229 },
    { key: 'Enter', keyCode: 13 },
    { key: 'Process', keyCode: 229 },
  ])(
    'preserves composing $key (keyCode=$keyCode) and submits once on ordinary Enter',
    ({ key, keyCode }) => {
      const { input, onSubmit } = setup();
      // 合成イベントによる回帰試験。実 OS IME や AI 通信の再現ではない。
      const confirmation = createEvent.keyDown(input, { key, keyCode, isComposing: true });
      fireEvent(input, confirmation);
      expect(confirmation.isTrusted).toBe(false);
      expect(confirmation.defaultPrevented).toBe(false);
      expect(onSubmit).not.toHaveBeenCalled();
      expect(input).toHaveValue('日本語');
      expect(input).toHaveFocus();

      const ordinaryEnter = createEvent.keyDown(input, {
        key: 'Enter',
        keyCode: 13,
        isComposing: false,
      });
      fireEvent(input, ordinaryEnter);
      expect(ordinaryEnter.defaultPrevented).toBe(true);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith('日本語');
      expect(input).toHaveValue('日本語');
      fireEvent.blur(input);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    }
  );

  test.each([
    { key: 'Enter', keyCode: 229 },
    { key: 'Enter', keyCode: 13 },
    { key: 'Process', keyCode: 229 },
  ])(
    'does not let composing $key (keyCode=$keyCode) clear controlled input',
    ({ key, keyCode }) => {
      // 親の消去コールバックを模した境界試験。実 ChatProvider は呼ばない。
      const { input, onSubmit } = setup({ clearOnSubmit: true });
      fireEvent.keyDown(input, { key, keyCode, isComposing: true });
      expect(onSubmit).not.toHaveBeenCalled();
      expect(input).toHaveValue('日本語');
      fireEvent.keyDown(input, { key: 'Enter', keyCode: 13, isComposing: false });
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith('日本語');
      expect(input).toHaveValue('');
    }
  );

  test.each([false, true])('leaves Shift+Enter unhandled when composing=%s', (isComposing) => {
    const { input, onSubmit } = setup();
    const event = createEvent.keyDown(input, {
      key: 'Enter',
      keyCode: isComposing ? 229 : 13,
      shiftKey: true,
      isComposing,
    });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(input).toHaveValue('日本語');
    // jsdom は既定の改行挿入をしないため、変更通知の保持だけを別に試す。
    fireEvent.change(input, { target: { value: '日本語\n次の行' } });
    expect(input).toHaveValue('日本語\n次の行');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test.each(['', '   '])('does not submit an empty or whitespace value %j', (initialValue) => {
    const { input, onSubmit } = setup({ initialValue });
    const event = createEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(input).toHaveValue(initialValue);
  });

  test('leaves Enter unhandled without a submit callback', () => {
    const { input } = setup({ withSubmit: false });
    const event = createEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
    fireEvent(input, event);
    expect(event.defaultPrevented).toBe(false);
    expect(input).toHaveValue('日本語');
  });

  test('does not submit or erase input on Escape or blur', () => {
    const { input, onSubmit } = setup();
    fireEvent.keyDown(input, { key: 'Escape', keyCode: 27 });
    fireEvent.blur(input);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(input).toHaveValue('日本語');
  });
});
