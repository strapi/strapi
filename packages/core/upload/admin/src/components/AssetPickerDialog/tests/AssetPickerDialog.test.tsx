import { within } from '@testing-library/react';
import { act, fireEvent, render, screen, server, waitFor } from '@tests/utils';
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

type Permissions = Array<{ action: string }>;

const renderDialog = (
  props: Partial<React.ComponentProps<typeof AssetPickerDialog>> = {},
  permissions?: (defaults: Permissions) => Permissions
) =>
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
    { initialEntries: [ENTRY_URL], providerOptions: permissions ? { permissions } : undefined }
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
    // The tabs appear once the read permission is confirmed.
    expect(await within(dialog).findByRole('tab', { name: 'Browse assets' })).toBeInTheDocument();
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

  describe('search', () => {
    // The field folds into a button on desktop only. jsdom's matchMedia matches
    // nothing, which the admin reads as mobile.
    const { matchMedia } = window;

    beforeAll(() => {
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
    });

    afterAll(() => {
      window.matchMedia = matchMedia;
    });

    it('starts as an icon button that opens a focused search field', async () => {
      renderDialog();

      await screen.findByText('hero.png');

      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      expect(screen.getByRole('searchbox')).toHaveFocus();
    });

    it('searches in memory, leaving the entry URL alone', async () => {
      const fileRequests: string[] = [];
      server.use(
        http.get('*/upload/files', ({ request }) => {
          fileRequests.push(decodeURIComponent(new URL(request.url).search));
          return HttpResponse.json({
            results: [createAsset(1, 'hero.png')],
            pagination: { page: 1, pageSize: 20, pageCount: 1, total: 1 },
          });
        })
      );

      renderDialog();

      fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'hero' } });

      await waitFor(() =>
        expect(fileRequests.some((search) => search.includes('_q=hero'))).toBe(true)
      );
      expect(screen.getByTestId('location')).toHaveTextContent(ENTRY_URL);
    });

    it('folds back into the icon button when it loses focus empty', async () => {
      renderDialog();

      fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
      fireEvent.blur(screen.getByRole('searchbox'));

      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    });

    it('folds back when opening a folder clears the search', async () => {
      server.use(
        http.get('*/upload/folders', () =>
          HttpResponse.json({ data: [createFolder(5, 'Blog content')] })
        )
      );

      renderDialog();

      fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
      const field = screen.getByRole('searchbox');
      fireEvent.change(field, { target: { value: 'blog' } });
      // Move focus elsewhere in the dialog, as clicking another control would.
      // (The dialog traps focus, so a plain blur would land back on the field.)
      act(() => screen.getByRole('button', { name: 'Filter' }).focus());

      // Search results include the folder; opening it drops the search.
      fireEvent.click(await screen.findByText('Blog content'));

      await waitFor(() => expect(screen.queryByRole('searchbox')).not.toBeInTheDocument());
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    });

    it('stays open while it holds a term', async () => {
      renderDialog();

      fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
      const field = screen.getByRole('searchbox');
      fireEvent.change(field, { target: { value: 'hero' } });
      fireEvent.blur(field);

      expect(screen.getByRole('searchbox')).toHaveValue('hero');
    });
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
      fireEvent.mouseDown(await screen.findByRole('tab', { name: 'Browse assets' }));
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

    describe('select all', () => {
      const elsewhere = createAsset(7, 'elsewhere.png');

      afterEach(() => {
        window.localStorage.removeItem('STRAPI_UPLOAD_LIBRARY_VIEW');
      });

      it.each([
        ['grid', 0],
        ['table', 1],
      ])('picks every loaded asset that fits the field, in %s view', async (_name, view) => {
        window.localStorage.setItem('STRAPI_UPLOAD_LIBRARY_VIEW', JSON.stringify(view));
        const onConfirm = jest.fn();
        renderDialog({
          multiple: true,
          allowedTypes: ['images'],
          initialSelection: [elsewhere],
          onConfirm,
        });

        fireEvent.mouseDown(await screen.findByRole('tab', { name: 'Browse assets' }));
        fireEvent.click(await screen.findByRole('checkbox', { name: 'Select all' }));

        // The PDF is outside allowedTypes; the asset from elsewhere stays first.
        fireEvent.click(addButton());

        expect(onConfirm).toHaveBeenCalledWith([elsewhere, hero, banner]);
      });

      it.each([
        ['grid', 0],
        ['table', 1],
      ])('un-picks only the loaded assets once all are picked, in %s view', async (_name, view) => {
        window.localStorage.setItem('STRAPI_UPLOAD_LIBRARY_VIEW', JSON.stringify(view));
        const onConfirm = jest.fn();
        renderDialog({
          multiple: true,
          allowedTypes: ['images'],
          initialSelection: [elsewhere],
          onConfirm,
        });

        fireEvent.mouseDown(await screen.findByRole('tab', { name: 'Browse assets' }));
        const selectAll = await screen.findByRole('checkbox', { name: 'Select all' });
        fireEvent.click(selectAll);
        fireEvent.click(selectAll);

        // Back to the field's value: the asset from another folder survived.
        expect(addButton()).toBeDisabled();
        expect(within(selectedTab()).getByText('1')).toBeInTheDocument();
      });

      it.each([
        ['grid', 0],
        ['table', 1],
      ])('is not offered on a single-value field, in %s view', async (_name, view) => {
        window.localStorage.setItem('STRAPI_UPLOAD_LIBRARY_VIEW', JSON.stringify(view));

        renderDialog();

        expect(
          await screen.findByRole('checkbox', { name: 'Select hero.png' })
        ).toBeInTheDocument();
        expect(screen.queryByRole('checkbox', { name: 'Select all' })).not.toBeInTheDocument();
      });
    });

    describe('with assets already in the field', () => {
      it('opens on the Selected tab, listing them', async () => {
        renderDialog({ multiple: true, initialSelection: [hero, banner] });

        expect(await screen.findByRole('tab', { name: /Selected assets/ })).toHaveAttribute(
          'aria-selected',
          'true'
        );
        expect(within(selectedTab()).getByText('2')).toBeInTheDocument();
        expect(screen.getByText('hero.png')).toBeInTheDocument();
        expect(screen.getByText('banner.png')).toBeInTheDocument();
      });

      it('keeps Add disabled until the selection changes', async () => {
        renderDialog({ multiple: true, initialSelection: [hero] });

        expect(await screen.findByRole('button', { name: 'Add' })).toBeDisabled();
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

  describe('reordering', () => {
    const hero = createAsset(1, 'hero.png');
    const banner = createAsset(2, 'banner.png');

    afterEach(() => {
      window.localStorage.removeItem('STRAPI_UPLOAD_LIBRARY_VIEW');
    });

    it('gives each selected asset a grip, and the browse list none', async () => {
      renderDialog({ multiple: true, initialSelection: [hero, banner] });

      const grips = await screen.findAllByRole('button', { name: /^Reorder / });

      // In selection order, which is the order the field will hold.
      expect(grips).toHaveLength(2);
      expect(grips[0]).toHaveAccessibleName('Reorder hero.png');
      expect(grips[1]).toHaveAccessibleName('Reorder banner.png');
      expect(grips[0]).toHaveAttribute('aria-roledescription', 'sortable');

      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Browse assets' }));
      await screen.findByText('Blog content');

      expect(screen.queryByRole('button', { name: /^Reorder / })).not.toBeInTheDocument();
    });

    it.each([
      ['Enter', 'Enter'],
      ['Space', ' '],
    ])('does not un-pick an asset when %s is pressed on its grip', async (code, key) => {
      renderDialog({ multiple: true, initialSelection: [hero, banner] });

      const grip = await screen.findByRole('button', { name: 'Reorder hero.png' });
      grip.focus();
      // The key starts a keyboard drag; it must not also reach the card, where
      // Enter and Space un-pick.
      fireEvent.keyDown(grip, { key, code });

      expect(
        within(screen.getByRole('tab', { name: /Selected assets/ })).getByText('2')
      ).toBeInTheDocument();
    });

    it('lets keys pressed on a grip reach the document, where a keyboard drag reads them', async () => {
      const documentKeys: string[] = [];
      const recordKey = (event: KeyboardEvent) => documentKeys.push(event.key);
      document.addEventListener('keydown', recordKey);

      try {
        renderDialog({ multiple: true, initialSelection: [hero, banner] });

        const grip = await screen.findByRole('button', { name: 'Reorder hero.png' });
        grip.focus();
        fireEvent.keyDown(grip, { key: 'ArrowRight', code: 'ArrowRight' });

        expect(documentKeys).toContain('ArrowRight');
      } finally {
        document.removeEventListener('keydown', recordKey);
      }
    });

    it('does not un-pick an asset when its grip is clicked', async () => {
      renderDialog({ multiple: true, initialSelection: [hero, banner] });

      fireEvent.click(await screen.findByRole('button', { name: 'Reorder hero.png' }));

      expect(
        within(screen.getByRole('tab', { name: /Selected assets/ })).getByText('2')
      ).toBeInTheDocument();
      expect(screen.getByText('hero.png')).toBeInTheDocument();
    });
  });

  describe('permissions', () => {
    const without = (action: string) => (defaults: Permissions) =>
      defaults.filter((permission) => permission.action !== action);

    it('lets a user who can read but not update the library pick assets', async () => {
      const onConfirm = jest.fn();
      renderDialog({ onConfirm }, without('plugin::upload.assets.update'));

      fireEvent.click(await screen.findByRole('checkbox', { name: 'Select hero.png' }));
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ id: 1 })]);
    });

    it('tells a user without read access, and fetches nothing', async () => {
      const fileRequests: string[] = [];
      server.use(
        http.get('*/upload/files', ({ request }) => {
          fileRequests.push(request.url);
          return HttpResponse.json({ results: [], pagination: { total: 0 } });
        })
      );

      renderDialog({}, without('plugin::upload.read'));

      expect(
        await screen.findByText("You don't have the permissions to access that content")
      ).toBeInTheDocument();
      expect(screen.getByText('Add asset for cover')).toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'Browse assets' })).not.toBeInTheDocument();
      expect(fileRequests).toHaveLength(0);
    });
  });
});
