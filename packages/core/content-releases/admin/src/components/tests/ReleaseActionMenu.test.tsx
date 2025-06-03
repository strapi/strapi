import { render, screen } from '@tests/utils';

import { ReleaseActionMenu } from '../ReleaseActionMenu';

describe('ReleaseActionMenu', () => {
  it('should render the menu with its options', async () => {
    const { user } = render(
      <ReleaseActionMenu.Root>
        <ReleaseActionMenu.DeleteReleaseActionItem releaseId="1" actionId="1" />
        <ReleaseActionMenu.ReleaseActionEntryLinkItem
          contentTypeUid="api::category.category"
          locale="en-GB"
          documentId="1"
        />
      </ReleaseActionMenu.Root>
    );

    await user.click(await screen.findByRole('button', { name: 'Release action options' }));

    expect(
      await screen.findByRole('menuitem', { name: 'Remove from release' })
    ).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: 'Edit entry' })).toBeInTheDocument();
  });
});
