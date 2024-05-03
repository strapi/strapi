import { render, screen, waitFor } from '@tests/utils';

import { EditPage } from '../EditPage';

describe('Users | EditPage', () => {
  it('should render', async () => {
    const { user } = render(<EditPage />, {
      initialEntries: ['/settings/users/1'],
    });

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());

    await screen.findByRole('heading', { name: 'Edit John Doe' });

    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /User's role/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: 'First name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Last name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();

    expect(screen.getByRole('checkbox', { name: 'Active' })).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: "User's roles" })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: "User's roles" }));

    await screen.findByRole('option', { name: 'Editor' });
  });
});
