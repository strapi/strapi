import { render, screen, waitFor, fireEvent } from '@tests/utils';

import { MainAreaContextMenu } from '../MainAreaContextMenu';

const onCreateFolder = jest.fn();
const onImportFiles = jest.fn();
const onImportFromUrl = jest.fn();

/**
 * Mirrors the admin layout: the column marked `data-strapi-main-content` is what
 * scrolls and what the menu listens on. `scroll-root` stands in for the strip of
 * that column which no descendant covers — its own bottom padding.
 */
const setup = (props: Partial<React.ComponentProps<typeof MainAreaContextMenu>> = {}) =>
  render(
    <div data-strapi-main-content data-testid="scroll-root">
      <div data-testid="background">
        {/* Stands in for an asset card / folder card / table row. */}
        <div data-testid="item" data-native-context-menu>
          asset.png
        </div>
        <button type="button">Add assets</button>
      </div>
      <MainAreaContextMenu
        disabled={false}
        onCreateFolder={onCreateFolder}
        onImportFiles={onImportFiles}
        onImportFromUrl={onImportFromUrl}
        {...props}
      />
    </div>
  );

const rightClick = (element: Element) =>
  fireEvent.contextMenu(element, { clientX: 120, clientY: 240 });

describe('MainAreaContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with no menu open', () => {
    setup();

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  // The column carries a bottom padding no descendant can cover, and that strip
  // is where a right-click below a full list lands. Listening on the column is
  // what puts it in reach.
  it('opens when the scrolling column itself is right-clicked', async () => {
    setup();

    rightClick(screen.getByTestId('scroll-root'));

    expect(await screen.findAllByRole('menuitem')).toHaveLength(3);
  });

  // The design system's Menu is a dropdown, so the popover needs a trigger to
  // hang off. A right-click on empty space has none — this is the stand-in.
  it('anchors the menu to a named, invisible, unfocusable element at the cursor', () => {
    setup();

    const anchor = screen.getByRole('button', { name: 'Media library actions' });

    expect(anchor).toHaveAttribute('tabindex', '-1');
    expect(anchor).toHaveStyle({
      position: 'fixed',
      width: '0px',
      height: '0px',
      opacity: '0',
      pointerEvents: 'none',
    });

    rightClick(screen.getByTestId('background'));

    expect(anchor).toHaveStyle({ top: '240px', left: '120px' });
  });

  it('mounts no anchor at all without the create permission', () => {
    setup({ disabled: true });

    expect(screen.queryByRole('button', { name: 'Media library actions' })).not.toBeInTheDocument();
  });

  it('opens the create actions when the empty area is right-clicked', async () => {
    setup();

    rightClick(screen.getByTestId('background'));

    const items = await screen.findAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'New folder',
      'File upload',
      'File upload from URL',
    ]);
  });

  it('suppresses the browser menu only when it opens its own', () => {
    setup();

    const opened = fireEvent.contextMenu(screen.getByTestId('background'), {
      clientX: 10,
      clientY: 10,
    });
    // fireEvent returns false once a listener called preventDefault().
    expect(opened).toBe(false);

    const passedThrough = fireEvent.contextMenu(screen.getByTestId('item'), {
      clientX: 10,
      clientY: 10,
    });
    expect(passedThrough).toBe(true);
  });

  it('leaves items marked `data-native-context-menu` to the browser', async () => {
    setup();

    rightClick(screen.getByTestId('item'));

    await waitFor(() => expect(screen.queryByRole('menuitem')).not.toBeInTheDocument());
  });

  it('leaves buttons in the background to the browser', async () => {
    setup();

    rightClick(screen.getByRole('button', { name: 'Add assets' }));

    await waitFor(() => expect(screen.queryByRole('menuitem')).not.toBeInTheDocument());
  });

  it('stays shut without the create permission', async () => {
    setup({ disabled: true });

    const event = fireEvent.contextMenu(screen.getByTestId('background'), {
      clientX: 10,
      clientY: 10,
    });

    expect(event).toBe(true);
    await waitFor(() => expect(screen.queryByRole('menuitem')).not.toBeInTheDocument());
  });

  it.each([
    ['New folder', () => onCreateFolder],
    ['File upload', () => onImportFiles],
    ['File upload from URL', () => onImportFromUrl],
  ])('runs %s and closes', async (label, getHandler) => {
    const { user } = setup();

    rightClick(screen.getByTestId('background'));
    await user.click(await screen.findByRole('menuitem', { name: label }));

    expect(getHandler()).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menuitem')).not.toBeInTheDocument());
  });

  it('dismisses on Escape', async () => {
    const { user } = setup();

    rightClick(screen.getByTestId('background'));
    await screen.findAllByRole('menuitem');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('menuitem')).not.toBeInTheDocument());
    expect(onCreateFolder).not.toHaveBeenCalled();
  });

  it('dismisses when the pointer goes down elsewhere', async () => {
    const { user } = setup();

    rightClick(screen.getByTestId('background'));
    await screen.findAllByRole('menuitem');

    await user.click(document.body);

    await waitFor(() => expect(screen.queryByRole('menuitem')).not.toBeInTheDocument());
  });

  it('re-anchors instead of vanishing when the background is right-clicked again', async () => {
    setup();

    rightClick(screen.getByTestId('background'));
    await screen.findAllByRole('menuitem');

    fireEvent.contextMenu(screen.getByTestId('background'), { clientX: 400, clientY: 80 });

    // Radix dismisses on the right-click's `pointerdown` before our handler
    // re-opens it — the menu must survive that round trip.
    await waitFor(() => expect(screen.getAllByRole('menuitem')).toHaveLength(3));
  });
});
