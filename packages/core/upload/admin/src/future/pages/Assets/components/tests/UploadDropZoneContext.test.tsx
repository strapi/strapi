import * as React from 'react';

import { fireEvent, render, screen } from '@tests/utils';

import { UploadDropZoneProvider, useUploadDropZone } from '../DropZone/UploadDropZoneContext';

describe('UploadDropZoneProvider', () => {
  it('keeps the value stable until dragging changes', () => {
    const renderConsumer = jest.fn();
    const Consumer = React.memo(() => {
      const { isDragging } = useUploadDropZone();

      renderConsumer(isDragging);

      return <span>{String(isDragging)}</span>;
    });
    const onDrop = jest.fn();
    const { rerender } = render(
      <UploadDropZoneProvider onDrop={onDrop}>
        <Consumer />
      </UploadDropZoneProvider>
    );

    expect(screen.getByText('false')).toBeInTheDocument();
    expect(renderConsumer).toHaveBeenCalledTimes(1);

    rerender(
      <UploadDropZoneProvider onDrop={onDrop}>
        <Consumer />
      </UploadDropZoneProvider>
    );

    expect(renderConsumer).toHaveBeenCalledTimes(1);

    fireEvent.dragEnter(screen.getByTestId('assets-dropzone'), {
      dataTransfer: { types: ['Files'] },
    });

    expect(screen.getByText('true')).toBeInTheDocument();
    expect(renderConsumer).toHaveBeenCalledTimes(2);
  });
});
