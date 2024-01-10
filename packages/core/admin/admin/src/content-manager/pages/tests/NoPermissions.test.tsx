import { render, screen } from '@tests/utils';

import { NoPermissions } from '../NoPermissionsPage';

describe('NoPermissions', () => {
  it('renders and matches the snapshot', () => {
    render(<NoPermissions />);

    expect(
      screen.getByText("You don't have the permissions to access that content")
    ).toBeInTheDocument();
  });
});
