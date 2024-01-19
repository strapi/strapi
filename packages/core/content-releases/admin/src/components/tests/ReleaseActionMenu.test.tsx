import { render, screen } from '@tests/utils';

import { ReleaseActionMenu } from '../ReleaseActionMenu';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }: { children: JSX.Element }) => <div>{children}</div>,
}));

describe('ReleaseActionMenu', () => {
  it('should render the menu with its options', async () => {
    const { user } = render(
      <ReleaseActionMenu.Root>
        <ReleaseActionMenu.DeleteReleaseActionItem releaseId="1" actionId="1" />
        <ReleaseActionMenu.ReleaseActionEntryLinkItem
          contentTypeUid="api::category.category"
          locale="en"
          entryId="1"
        />
      </ReleaseActionMenu.Root>
    );

    const menuTrigger = screen.getByRole('button', { name: 'Release action options' });
    expect(menuTrigger).toBeInTheDocument();

    await user.click(menuTrigger);
    expect(screen.getByRole('menuitem', { name: 'Remove from release' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Edit entry' })).toBeInTheDocument();
  });
});
