import { render, screen } from '@tests/utils';

import { ProfileWidget } from '../Widgets';

// Mock the useAuth hook
jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useAuth: (_consumerName: string, selector: (state: any) => any) =>
    selector({
      user: {
        firstname: 'Ted',
        lastname: 'Lasso',
        email: 'ted.lasso@afcrichmond.co.uk',
        roles: [
          { id: 1, name: 'Super Admin' },
          { id: 2, name: 'Editor' },
        ],
      },
    }),
}));

describe('Homepage Widget Profile component', () => {
  it('should render the widget with correct user info', async () => {
    render(<ProfileWidget />);

    expect(await screen.findByText('Ted Lasso')).toBeInTheDocument();
    expect(await screen.findByText('ted.lasso@afcrichmond.co.uk')).toBeInTheDocument();
    expect(await screen.findByText('Super Admin')).toBeInTheDocument();
    expect(await screen.findByText('Editor')).toBeInTheDocument();
  });
});
