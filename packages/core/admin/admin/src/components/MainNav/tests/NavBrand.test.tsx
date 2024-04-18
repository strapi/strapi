import { render, screen } from '@tests/utils';

import { NavBrand } from '../NavBrand';

jest.mock('../../../features/Configuration', () => ({
  ...jest.requireActual('../../../features/Configuration'),
  useConfiguration: () => ({
    logos: {
      menu: {
        default: 'default',
        custom: {
          url: 'custom',
        },
      },
    },
  }),
}));

describe('NavBrand', () => {
  it('shows the NavBrand with no action on click', () => {
    render(<NavBrand />);
    const logo = screen.getByAltText('Application logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'custom');
    expect(screen.getByText('Strapi Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Workplace')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
