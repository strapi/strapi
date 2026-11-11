import * as React from 'react';

import { act, render, screen } from '@strapi/admin/strapi-admin/test';

import { FullScreenImage } from '../FullScreenImage';

const { useFullScreenImage } = FullScreenImage;

/**
 * A memoised consumer only re-renders when the context value identity changes,
 * which is exactly what the provider's `useMemo` controls. Render counts pin
 * stability, the recorded values pin propagation of every field.
 */
const createConsumer = () => {
  const renderConsumer = jest.fn();
  const Consumer = React.memo(function Consumer() {
    const value = useFullScreenImage();

    renderConsumer(value);

    return <span data-testid="consumer">{`${value.isOpen}|${value.src}|${value.alt}`}</span>;
  });

  return { renderConsumer, Consumer };
};

type FullScreenImageValue = ReturnType<typeof useFullScreenImage>;

const lastValue = (spy: jest.Mock): FullScreenImageValue => spy.mock.calls.at(-1)?.[0];

const SRC = 'data:image/png;base64,AAAA';
const OTHER_SRC = 'data:image/png;base64,BBBB';

describe('FullScreenImage context', () => {
  it('keeps the value stable when the provider re-renders with identical props', () => {
    const onClose = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <FullScreenImage.Root src={SRC} alt="a cat" onClose={onClose}>
        <Consumer />
      </FullScreenImage.Root>
    );

    expect(screen.getByTestId('consumer')).toHaveTextContent(`false|${SRC}|a cat`);
    expect(renderConsumer).toHaveBeenCalledTimes(1);

    rerender(
      <FullScreenImage.Root src={SRC} alt="a cat" onClose={onClose}>
        <Consumer />
      </FullScreenImage.Root>
    );

    expect(renderConsumer).toHaveBeenCalledTimes(1);
  });

  it('propagates `src` and `alt` changes to the consumer', () => {
    const onClose = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <FullScreenImage.Root src={SRC} alt="a cat" onClose={onClose}>
        <Consumer />
      </FullScreenImage.Root>
    );

    expect(lastValue(renderConsumer).src).toBe(SRC);
    expect(lastValue(renderConsumer).alt).toBe('a cat');

    rerender(
      <FullScreenImage.Root src={OTHER_SRC} alt="a dog" onClose={onClose}>
        <Consumer />
      </FullScreenImage.Root>
    );

    expect(lastValue(renderConsumer).src).toBe(OTHER_SRC);
    expect(lastValue(renderConsumer).alt).toBe('a dog');
  });

  it('propagates `isOpen` to the consumer when the context `open` is called', () => {
    const onClose = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <FullScreenImage.Root src={SRC} alt="a cat" onClose={onClose}>
        <Consumer />
      </FullScreenImage.Root>
    );

    expect(lastValue(renderConsumer).isOpen).toBe(false);

    act(() => {
      lastValue(renderConsumer).open();
    });

    expect(lastValue(renderConsumer).isOpen).toBe(true);
    expect(screen.getByTestId('consumer')).toHaveTextContent(`true|${SRC}|a cat`);
  });

  it('keeps `open` identity stable across re-renders and prop changes', () => {
    const onClose = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <FullScreenImage.Root src={SRC} alt="a cat" onClose={onClose}>
        <Consumer />
      </FullScreenImage.Root>
    );

    const initialOpen = lastValue(renderConsumer).open;

    rerender(
      <FullScreenImage.Root src={OTHER_SRC} alt="a dog" onClose={jest.fn()}>
        <Consumer />
      </FullScreenImage.Root>
    );

    expect(lastValue(renderConsumer).open).toBe(initialOpen);
  });

  it('gives the consumer a `close` bound to the latest `onClose`', () => {
    const firstOnClose = jest.fn();
    const secondOnClose = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <FullScreenImage.Root src={SRC} alt="a cat" onClose={firstOnClose}>
        <Consumer />
      </FullScreenImage.Root>
    );

    const initialClose = lastValue(renderConsumer).close;

    act(() => {
      lastValue(renderConsumer).open();
    });

    rerender(
      <FullScreenImage.Root src={SRC} alt="a cat" onClose={secondOnClose}>
        <Consumer />
      </FullScreenImage.Root>
    );

    // A new `onClose` must mint a new `close`, otherwise the consumer would keep
    // calling the stale handler.
    expect(lastValue(renderConsumer).close).not.toBe(initialClose);

    act(() => {
      lastValue(renderConsumer).close();
    });

    expect(firstOnClose).not.toHaveBeenCalled();
    expect(secondOnClose).toHaveBeenCalledTimes(1);
    expect(lastValue(renderConsumer).isOpen).toBe(false);
  });

  it('closes without an `onClose` prop', () => {
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <FullScreenImage.Root src={SRC} alt="a cat" defaultOpen>
        <Consumer />
      </FullScreenImage.Root>
    );

    expect(lastValue(renderConsumer).isOpen).toBe(true);

    act(() => {
      lastValue(renderConsumer).close();
    });

    expect(lastValue(renderConsumer).isOpen).toBe(false);
  });
});
