import * as React from 'react';

import { fireEvent, render, screen, waitFor } from '@strapi/admin/strapi-admin/test';

import { Dropzone, useDropzoneContext } from '../Dropzone';

/**
 * A memoised consumer only re-renders when the context value identity changes,
 * which is exactly what the provider's `useMemo` controls. Render counts pin
 * stability, the recorded values pin propagation of every field.
 */
const createConsumer = () => {
  const renderConsumer = jest.fn();
  const Consumer = React.memo(function Consumer() {
    const { isEnabled, isDragActive, onAddFiles } = useDropzoneContext();

    renderConsumer({ isEnabled, isDragActive, onAddFiles });

    return <span data-testid="consumer">{`${isEnabled}|${isDragActive}`}</span>;
  });

  return { renderConsumer, Consumer };
};

type DropzoneValue = ReturnType<typeof useDropzoneContext>;

const lastValue = (spy: jest.Mock): DropzoneValue => spy.mock.calls.at(-1)?.[0];

describe('Dropzone context', () => {
  it('keeps the value stable when the provider re-renders with identical props', () => {
    const onAddFiles = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <Dropzone.Root isEnabled onAddFiles={onAddFiles}>
        <Consumer />
      </Dropzone.Root>
    );

    expect(screen.getByTestId('consumer')).toHaveTextContent('true|false');
    expect(renderConsumer).toHaveBeenCalledTimes(1);

    rerender(
      <Dropzone.Root isEnabled onAddFiles={onAddFiles}>
        <Consumer />
      </Dropzone.Root>
    );

    expect(renderConsumer).toHaveBeenCalledTimes(1);
  });

  it('propagates an `isEnabled` change to the consumer', () => {
    const onAddFiles = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <Dropzone.Root isEnabled onAddFiles={onAddFiles}>
        <Consumer />
      </Dropzone.Root>
    );

    expect(lastValue(renderConsumer).isEnabled).toBe(true);

    rerender(
      <Dropzone.Root isEnabled={false} onAddFiles={onAddFiles}>
        <Consumer />
      </Dropzone.Root>
    );

    expect(lastValue(renderConsumer).isEnabled).toBe(false);
    expect(renderConsumer).toHaveBeenCalledTimes(2);
  });

  it('propagates a new `onAddFiles` to the consumer', () => {
    const firstOnAddFiles = jest.fn();
    const secondOnAddFiles = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <Dropzone.Root isEnabled onAddFiles={firstOnAddFiles}>
        <Consumer />
      </Dropzone.Root>
    );

    expect(lastValue(renderConsumer).onAddFiles).toBe(firstOnAddFiles);

    rerender(
      <Dropzone.Root isEnabled onAddFiles={secondOnAddFiles}>
        <Consumer />
      </Dropzone.Root>
    );

    expect(lastValue(renderConsumer).onAddFiles).toBe(secondOnAddFiles);

    lastValue(renderConsumer).onAddFiles?.([]);

    expect(firstOnAddFiles).not.toHaveBeenCalled();
    expect(secondOnAddFiles).toHaveBeenCalledTimes(1);
  });

  it('propagates the `isDragActive` change owned by react-dropzone', async () => {
    const onAddFiles = jest.fn();
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <Dropzone.Root isEnabled onAddFiles={onAddFiles} data-testid="dropzone-root">
        <Consumer />
      </Dropzone.Root>
    );

    expect(lastValue(renderConsumer).isDragActive).toBe(false);

    // `react-dropzone` resolves the dragged files before flipping its state, so
    // the consumer update lands on a later tick.
    fireEvent.dragEnter(screen.getByTestId('dropzone-root'), {
      dataTransfer: { types: ['Files'], files: [] },
    });

    await waitFor(() => {
      expect(lastValue(renderConsumer).isDragActive).toBe(true);
    });

    expect(screen.getByTestId('consumer')).toHaveTextContent('true|true');
  });
});
