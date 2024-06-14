import { screen, render } from '@tests/utils';

import { NavUser } from '../NavUser';

describe('NavUser', () => {
  it('shows the initials of the user', async () => {
    render(<NavUser initials="JD">John Doe</NavUser>);

    await screen.findByText('JD');
  });

  it('contains the user name', async () => {
    render(<NavUser initials="JD">John Doe</NavUser>);
    await screen.findByText('JD');
    const userName = screen.getByText('John Doe');
    expect(userName).toBeInTheDocument();
  });

  it('shows the user menu when clicked', async () => {
    const { user } = render(<NavUser initials="JD">John Doe</NavUser>);
    await screen.findByText('JD');
    const buttonMenu = screen.getByRole('button');
    await user.click(buttonMenu);
    const userMenu = screen.getByRole('menu');
    expect(userMenu).toBeInTheDocument();
  });

  it('shows the profile link in the user menu when clicked', async () => {
    const { user } = render(<NavUser initials="JD">John Doe</NavUser>);
    await screen.findByText('JD');
    const buttonMenu = screen.getByRole('button');
    await user.click(buttonMenu);
    const profileLink = screen.getByText('Profile');
    expect(profileLink).toBeInTheDocument();
  });

  it('shows the logout link in the user menu when clicked', async () => {
    const { user } = render(<NavUser initials="JD">John Doe</NavUser>);
    await screen.findByText('JD');
    const buttonMenu = screen.getByRole('button');
    await user.click(buttonMenu);
    const logoutLink = screen.getByText('Logout');
    expect(logoutLink).toBeInTheDocument();
  });
});
