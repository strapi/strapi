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

  it('fills the admin column as a flex item instead of a percentage min-height', () => {
    // Between the scrolling column and `Layouts.Root`: a `min-height: 100%` here
    // ignored the top banners, so the column scrolled by their height and the
    // bottom of the folder sidebar ended up off-screen.
    render(
      <UploadDropZoneProvider onDrop={jest.fn()}>
        <span>child</span>
      </UploadDropZoneProvider>
    );

    expect(screen.getByTestId('assets-dropzone')).toHaveStyle({ flexGrow: '1', minHeight: '0' });
  });
});
