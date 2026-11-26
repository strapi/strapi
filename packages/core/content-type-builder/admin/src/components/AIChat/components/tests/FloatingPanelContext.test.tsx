import * as React from 'react';

import { render, screen } from '@strapi/admin/strapi-admin/test';

import { Panel, usePanel } from '../FloatingPanel';

/**
 * A memoised consumer only re-renders when the context value identity changes,
 * which is exactly what the provider's `useMemo` controls. Render counts pin
 * stability, the recorded values pin propagation of every field.
 */
const createConsumer = () => {
  const renderConsumer = jest.fn();
  const Consumer = React.memo(function Consumer() {
    const { size, position, isOpen, onToggle } = usePanel();

    renderConsumer({ size, position, isOpen, onToggle });

    return (
      <button type="button" onClick={onToggle}>
        {`${size}|${position}|${isOpen}`}
      </button>
    );
  });

  return { renderConsumer, Consumer };
};

type PanelValue = ReturnType<typeof usePanel>;

const lastValue = (spy: jest.Mock): PanelValue => spy.mock.calls.at(-1)?.[0];

describe('FloatingPanel context', () => {
  it('keeps the value stable when the provider re-renders with identical props', () => {
    const onToggle = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <Panel.Root isOpen size="md" position="bottom-right" onToggle={onToggle}>
        <Consumer />
      </Panel.Root>
    );

    expect(screen.getByRole('button')).toHaveTextContent('md|bottom-right|true');
    expect(renderConsumer).toHaveBeenCalledTimes(1);

    rerender(
      <Panel.Root isOpen size="md" position="bottom-right" onToggle={onToggle}>
        <Consumer />
      </Panel.Root>
    );

    expect(renderConsumer).toHaveBeenCalledTimes(1);
  });

  it('propagates a `size` change to the consumer', () => {
    const onToggle = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <Panel.Root isOpen size="md" position="bottom-right" onToggle={onToggle}>
        <Consumer />
      </Panel.Root>
    );

    expect(lastValue(renderConsumer).size).toBe('md');

    rerender(
      <Panel.Root isOpen size="lg" position="bottom-right" onToggle={onToggle}>
        <Consumer />
      </Panel.Root>
    );

    expect(lastValue(renderConsumer).size).toBe('lg');
    expect(renderConsumer).toHaveBeenCalledTimes(2);
  });

  it('propagates a `position` change to the consumer', () => {
    const onToggle = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <Panel.Root isOpen size="md" position="bottom-right" onToggle={onToggle}>
        <Consumer />
      </Panel.Root>
    );

    expect(lastValue(renderConsumer).position).toBe('bottom-right');

    rerender(
      <Panel.Root isOpen size="md" position="top-left" onToggle={onToggle}>
        <Consumer />
      </Panel.Root>
    );

    expect(lastValue(renderConsumer).position).toBe('top-left');
  });

  it('propagates a new `onToggle` to the consumer', async () => {
    const firstOnToggle = jest.fn();
    const secondOnToggle = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender, user } = render(
      <Panel.Root isOpen size="md" position="bottom-right" onToggle={firstOnToggle}>
        <Consumer />
      </Panel.Root>
    );

    expect(lastValue(renderConsumer).onToggle).toBe(firstOnToggle);

    rerender(
      <Panel.Root isOpen size="md" position="bottom-right" onToggle={secondOnToggle}>
        <Consumer />
      </Panel.Root>
    );

    expect(lastValue(renderConsumer).onToggle).toBe(secondOnToggle);

    await user.click(screen.getByRole('button'));

    expect(firstOnToggle).not.toHaveBeenCalled();
    expect(secondOnToggle).toHaveBeenCalledTimes(1);
  });

  it('propagates an `isOpen` change to the consumer', () => {
    const onToggle = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();

    /**
     * `Root` only mounts `children` while open and only mounts `toggleIcon`
     * while closed, so the consumer sits in both slots: exactly one of them is
     * mounted at any time, whatever `isOpen` is.
     */
    const { rerender } = render(
      <Panel.Root
        isOpen={false}
        size="md"
        position="bottom-right"
        onToggle={onToggle}
        toggleIcon={<Consumer />}
      >
        <Consumer />
      </Panel.Root>
    );

    expect(lastValue(renderConsumer).isOpen).toBe(false);

    rerender(
      <Panel.Root
        isOpen
        size="md"
        position="bottom-right"
        onToggle={onToggle}
        toggleIcon={<Consumer />}
      >
        <Consumer />
      </Panel.Root>
    );

    expect(lastValue(renderConsumer).isOpen).toBe(true);
  });
});
