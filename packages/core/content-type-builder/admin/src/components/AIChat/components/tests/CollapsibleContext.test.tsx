import * as React from 'react';

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { Collapsible, useCollapsible } from '../Collapsible';

/**
 * `Collapsible` renders nothing but its provider, so plain RTL is enough — no
 * theme or intl is reachable from the code under test.
 *
 * The consumer is memoised on purpose: a memoised consumer only re-renders when
 * the context value identity changes, which is exactly what the provider's
 * `useMemo` controls. Render counts therefore pin value stability, and the
 * recorded values pin propagation.
 */
const createConsumer = () => {
  const renderConsumer = jest.fn();
  const Consumer = React.memo(function Consumer() {
    const { open, toggle } = useCollapsible();

    renderConsumer({ open, toggle });

    return (
      <button type="button" onClick={toggle}>
        {String(open)}
      </button>
    );
  });

  return { renderConsumer, Consumer };
};

type CollapsibleValue = ReturnType<typeof useCollapsible>;

const lastValue = (spy: jest.Mock): CollapsibleValue => spy.mock.calls.at(-1)?.[0];

describe('Collapsible context', () => {
  it('keeps the value stable when the provider re-renders with identical props', () => {
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <Collapsible>
        <Consumer />
      </Collapsible>
    );

    expect(screen.getByRole('button')).toHaveTextContent('false');
    expect(renderConsumer).toHaveBeenCalledTimes(1);

    rerender(
      <Collapsible>
        <Consumer />
      </Collapsible>
    );

    expect(renderConsumer).toHaveBeenCalledTimes(1);
  });

  it('exposes the initial `open` from `defaultOpen`', () => {
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <Collapsible defaultOpen>
        <Consumer />
      </Collapsible>
    );

    expect(lastValue(renderConsumer).open).toBe(true);
  });

  it('flips `open` for the consumer when the context `toggle` is called', async () => {
    const user = userEvent.setup();
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <Collapsible>
        <Consumer />
      </Collapsible>
    );

    expect(lastValue(renderConsumer).open).toBe(false);

    await user.click(screen.getByRole('button'));

    expect(lastValue(renderConsumer).open).toBe(true);
    expect(screen.getByRole('button')).toHaveTextContent('true');

    await user.click(screen.getByRole('button'));

    expect(lastValue(renderConsumer).open).toBe(false);
  });

  it('keeps `toggle` identity stable across re-renders and across `open` changes', async () => {
    const user = userEvent.setup();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <Collapsible>
        <Consumer />
      </Collapsible>
    );

    const initialToggle = lastValue(renderConsumer).toggle;

    rerender(
      <Collapsible>
        <Consumer />
      </Collapsible>
    );

    await user.click(screen.getByRole('button'));

    expect(lastValue(renderConsumer).open).toBe(true);
    expect(lastValue(renderConsumer).toggle).toBe(initialToggle);
  });
});
