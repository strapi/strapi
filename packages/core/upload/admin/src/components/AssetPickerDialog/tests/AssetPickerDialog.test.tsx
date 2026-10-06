import { within } from '@testing-library/react';
import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';

import { AssetPickerDialog } from '../AssetPickerDialog';

import type { File } from '../../../../../shared/contracts/files';

jest.mock('../../../pages/Assets/hooks/useInfiniteScrollSentinel', () => {
  const { useRef } = jest.requireActual('react');

  return { useInfiniteScrollSentinel: () => useRef(null) };
});

const createAsset = (id: number, name: string): File => ({
  id,
  name,
  hash: `hash_${id}`,
  ext: '.png',
  mime: 'image/png',
  url: `/uploads/${name}`,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

const createFolder = (id: number, name: string) => ({
  id,
  name,
  pathId: id,
  path: `/${id}`,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  children: { count: 0 },
  files: { count: 0 },
});

const LocationProbe = () => {
  const { pathname, search } = useLocation();

  return <span data-testid="location">{`${pathname}${search}`}</span>;
};

const ENTRY_URL =
  '/content-manager/collection-types/api::article.article/1?plugins[i18n][locale]=en';

const renderDialog = (props: Partial<React.ComponentProps<typeof AssetPickerDialog>> = {}) =>
  render(
    <>
      <AssetPickerDialog
        open
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Add asset for cover"
        {...props}
      />
      <LocationProbe />
    </>,
    { initialEntries: [ENTRY_URL] }
  );

describe('AssetPickerDialog', () => {
  let folderRequests: string[];

  beforeEach(() => {
    folderRequests = [];
    server.use(
      http.get('*/upload/files', () =>
        HttpResponse.json({
          results: [createAsset(1, 'hero.png')],
          pagination: { page: 1, pageSize: 20, pageCount: 1, total: 1 },
        })
      ),
      http.get('*/upload/folders', ({ request }) => {
        folderRequests.push(decodeURIComponent(new URL(request.url).search));

        return HttpResponse.json({ data: [createFolder(5, 'Blog content')] });
      }),
      http.get('*/upload/folder-structure', () =>
        HttpResponse.json({
          data: [{ id: 5, name: 'Blog content', children: [] }],
        })
      )
    );
  });

  it('shows the title, both tabs and a disabled Add button', async () => {
    renderDialog();

    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Add asset for cover')).toBeInTheDocument();
    expect(within(dialog).getByRole('tab', { name: 'Browse assets' })).toBeInTheDocument();
    expect(within(dialog).getByRole('tab', { name: /Selected assets/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('lists the library root', async () => {
    renderDialog();

    expect(await screen.findByText('hero.png')).toBeInTheDocument();
    expect(screen.getByText('Blog content')).toBeInTheDocument();
  });

  it('titles each grid section with its count, using the server total for assets', async () => {
    server.use(
      http.get('*/upload/files', () =>
        HttpResponse.json({
          results: [createAsset(1, 'hero.png')],
          pagination: { page: 1, pageSize: 20, pageCount: 3, total: 42 },
        })
      )
    );

    renderDialog();

    expect(await screen.findByRole('heading', { name: 'Folders (1)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Assets (42)' })).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('drops the folders section and its divider when there are no folders', async () => {
    server.use(http.get('*/upload/folders', () => HttpResponse.json({ data: [] })));

    renderDialog();

    expect(await screen.findByRole('heading', { name: 'Assets (1)' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Folders/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('opens a folder without touching the entry URL', async () => {
    renderDialog();

    fireEvent.click(await screen.findByText('Blog content'));

    await waitFor(() =>
      expect(folderRequests.some((search) => search.includes('[parent][id]=5'))).toBe(true)
    );
    expect(screen.getByTestId('location')).toHaveTextContent(ENTRY_URL);
  });

  describe('breadcrumbs', () => {
    const findTrail = () => screen.findByRole('navigation', { name: 'Folder navigation' });

    it('are not shown at the library root', async () => {
      renderDialog();

      await screen.findByText('hero.png');

      expect(
        screen.queryByRole('navigation', { name: 'Folder navigation' })
      ).not.toBeInTheDocument();
    });

    it('show the trail inside a folder and lead back to the root', async () => {
      renderDialog();

      fireEvent.click(await screen.findByText('Blog content'));

      const trail = await findTrail();

      expect(within(trail).getByText('Blog content')).toBeInTheDocument();

      fireEvent.click(within(trail).getByRole('button', { name: 'Home' }));

      // The root list comes back from the RTK cache, so assert on what is shown.
      await waitFor(() =>
        expect(
          screen.queryByRole('navigation', { name: 'Folder navigation' })
        ).not.toBeInTheDocument()
      );
      expect(screen.getByText('Blog content')).toBeInTheDocument();
    });

    it('collapse the middle of a deep trail into a menu', async () => {
      server.use(
        http.get('*/upload/folders', () =>
          HttpResponse.json({ data: [createFolder(4, 'October')] })
        ),
        http.get('*/upload/folder-structure', () =>
          HttpResponse.json({
            data: [
              {
                id: 1,
                name: 'Blog',
                children: [
                  {
                    id: 2,
                    name: '2026',
                    children: [
                      { id: 3, name: 'Q4', children: [{ id: 4, name: 'October', children: [] }] },
                    ],
                  },
                ],
              },
            ],
          })
        )
      );

      renderDialog();

      fireEvent.click(await screen.findByText('October'));

      const trail = await findTrail();

      expect(within(trail).getByRole('button', { name: 'Blog' })).toBeInTheDocument();
      expect(within(trail).getByRole('button', { name: 'Show more folders' })).toBeInTheDocument();
      expect(within(trail).queryByRole('button', { name: '2026' })).not.toBeInTheDocument();
      expect(within(trail).getByRole('button', { name: 'Q4' })).toBeInTheDocument();
      expect(within(trail).getByText('October')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    const hero = createAsset(1, 'hero.png');
    const banner = createAsset(2, 'banner.png');
    const brochure: File = {
      ...createAsset(3, 'brochure.pdf'),
      mime: 'application/pdf',
      ext: '.pdf',
    };

    beforeEach(() => {
      server.use(
        http.get('*/upload/files', () =>
          HttpResponse.json({
            results: [hero, banner, brochure],
            pagination: { page: 1, pageSize: 20, pageCount: 1, total: 3 },
          })
        )
      );
    });

    const selectedTab = () => screen.getByRole('tab', { name: /Selected assets/ });
    const addButton = () => screen.getByRole('button', { name: 'Add' });
    const checkboxFor = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` });

    it('picks an asset on click, counts it and confirms it', async () => {
      const onConfirm = jest.fn();
      renderDialog({ multiple: true, onConfirm });

      fireEvent.click(await screen.findByText('hero.png'));

      expect(within(selectedTab()).getByText('1')).toBeInTheDocument();
      expect(checkboxFor('hero.png')).toBeChecked();

      fireEvent.click(addButton());

      expect(onConfirm).toHaveBeenCalledWith([hero]);
    });

    it('keeps the order picks were made in', async () => {
      const onConfirm = jest.fn();
      renderDialog({ multiple: true, initialSelection: [banner], onConfirm });

      // Radix tabs switch on mouse down, not click.
      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Browse assets' }));
      fireEvent.click(await screen.findByText('hero.png'));
      fireEvent.click(addButton());

      expect(onConfirm).toHaveBeenCalledWith([banner, hero]);
    });

    it('replaces the pick on a single-value field', async () => {
      const onConfirm = jest.fn();
      renderDialog({ onConfirm });

      fireEvent.click(await screen.findByText('hero.png'));
      fireEvent.click(screen.getByText('banner.png'));

      expect(checkboxFor('hero.png')).not.toBeChecked();
      expect(within(selectedTab()).getByText('1')).toBeInTheDocument();

      fireEvent.click(addButton());

      expect(onConfirm).toHaveBeenCalledWith([banner]);
    });

    it('greys out assets outside allowedTypes and ignores clicks on them', async () => {
      renderDialog({ multiple: true, allowedTypes: ['images'] });

      fireEvent.click(await screen.findByText('brochure.pdf'));

      expect(checkboxFor('brochure.pdf')).toBeDisabled();
      expect(within(selectedTab()).getByText('0')).toBeInTheDocument();
    });

    it('offers no checkbox and no actions on folders, and no actions on assets', async () => {
      renderDialog({ multiple: true });

      await screen.findByText('hero.png');

      expect(
        screen.queryByRole('checkbox', { name: 'Select Blog content' })
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument();
    });

    it('keeps the selection while browsing into a folder', async () => {
      renderDialog({ multiple: true });

      fireEvent.click(await screen.findByText('hero.png'));
      fireEvent.click(screen.getByText('Blog content'));

      await screen.findByRole('navigation', { name: 'Folder navigation' });

      expect(within(selectedTab()).getByText('1')).toBeInTheDocument();
    });

    it('offers no select-all in the table view, only a checkbox per asset', async () => {
      window.localStorage.setItem('STRAPI_UPLOAD_LIBRARY_VIEW', JSON.stringify(1));

      try {
        renderDialog({ multiple: true });

        expect(
          await screen.findByRole('checkbox', { name: 'Select hero.png' })
        ).toBeInTheDocument();
        expect(screen.queryByRole('checkbox', { name: 'Select all' })).not.toBeInTheDocument();
      } finally {
        window.localStorage.removeItem('STRAPI_UPLOAD_LIBRARY_VIEW');
      }
    });

    describe('with assets already in the field', () => {
      it('opens on the Selected tab, listing them', async () => {
        renderDialog({ multiple: true, initialSelection: [hero, banner] });

        expect(selectedTab()).toHaveAttribute('aria-selected', 'true');
        expect(within(selectedTab()).getByText('2')).toBeInTheDocument();
        expect(screen.getByText('hero.png')).toBeInTheDocument();
        expect(screen.getByText('banner.png')).toBeInTheDocument();
      });

      it('keeps Add disabled until the selection changes', async () => {
        renderDialog({ multiple: true, initialSelection: [hero] });

        expect(addButton()).toBeDisabled();
      });

      it('confirms what is left after unchecking, which removes it from the field', async () => {
        const onConfirm = jest.fn();
        renderDialog({ multiple: true, initialSelection: [hero, banner], onConfirm });

        fireEvent.click(await screen.findByRole('checkbox', { name: 'Select hero.png' }));

        expect(screen.queryByText('hero.png')).not.toBeInTheDocument();

        fireEvent.click(addButton());

        expect(onConfirm).toHaveBeenCalledWith([banner]);
      });
    });
  });
});
