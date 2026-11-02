import { within } from '@testing-library/react';
import { fireEvent, render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { MediaLibraryPickerDialog } from '../MediaLibraryPickerDialog';

import type { File } from '../../../../../shared/contracts/files';

jest.mock('../../../pages/Assets/hooks/useInfiniteScrollSentinel', () => {
  const { useRef } = jest.requireActual('react');

  return { useInfiniteScrollSentinel: () => useRef(null) };
});

const createAsset = (id: number, name: string, mime = 'image/png'): File => ({
  id,
  name,
  hash: `hash_${id}`,
  ext: name.slice(name.lastIndexOf('.')),
  mime,
  url: `/uploads/${name}`,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

const hero = createAsset(1, 'hero.png');
const banner = createAsset(2, 'banner.png');
const guide = createAsset(3, 'guide.pdf', 'application/pdf');

const confirmButton = () => screen.getByRole('button', { name: 'Confirm' });
const checkboxFor = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` });

describe('MediaLibraryPickerDialog', () => {
  beforeEach(() => {
    server.use(
      http.get('*/upload/files', () =>
        HttpResponse.json({
          results: [hero, banner, guide],
          pagination: { page: 1, pageSize: 20, pageCount: 1, total: 3 },
        })
      ),
      http.get('*/upload/folders', () => HttpResponse.json({ data: [] })),
      http.get('*/upload/folder-structure', () => HttpResponse.json({ data: [] }))
    );
  });

  it('opens with a generic title and nothing selected', async () => {
    render(<MediaLibraryPickerDialog onClose={jest.fn()} onSelectAssets={jest.fn()} />);

    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Add assets')).toBeInTheDocument();
    expect(await within(dialog).findByText('hero.png')).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  it('picks several assets by default and hands them over in order', async () => {
    const onSelectAssets = jest.fn();
    render(<MediaLibraryPickerDialog onClose={jest.fn()} onSelectAssets={onSelectAssets} />);

    fireEvent.click(await screen.findByText('banner.png'));
    fireEvent.click(screen.getByText('hero.png'));

    expect(checkboxFor('banner.png')).toBeChecked();
    expect(checkboxFor('hero.png')).toBeChecked();

    fireEvent.click(confirmButton());

    expect(onSelectAssets).toHaveBeenCalledWith([banner, hero]);
  });

  it('keeps a single pick when multiple is off', async () => {
    const onSelectAssets = jest.fn();
    render(
      <MediaLibraryPickerDialog
        multiple={false}
        onClose={jest.fn()}
        onSelectAssets={onSelectAssets}
      />
    );

    fireEvent.click(await screen.findByText('hero.png'));
    fireEvent.click(screen.getByText('banner.png'));
    fireEvent.click(confirmButton());

    expect(onSelectAssets).toHaveBeenCalledWith([banner]);
  });

  it('only lets the allowed types be picked', async () => {
    render(
      <MediaLibraryPickerDialog
        allowedTypes={['images']}
        onClose={jest.fn()}
        onSelectAssets={jest.fn()}
      />
    );

    fireEvent.click(await screen.findByText('guide.pdf'));

    expect(checkboxFor('guide.pdf')).toBeDisabled();
    expect(checkboxFor('hero.png')).toBeEnabled();
  });

  it('closes on Cancel', async () => {
    const onClose = jest.fn();
    render(<MediaLibraryPickerDialog onClose={onClose} onSelectAssets={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });
});
