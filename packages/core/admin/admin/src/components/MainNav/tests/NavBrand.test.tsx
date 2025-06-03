import { render, screen } from '@tests/utils';

import { NavBrand } from '../NavBrand';

describe('NavBrand', () => {
  it('shows the NavBrand with no action on click', async () => {
    render(<NavBrand />);
    const logo = screen.getByAltText('Application logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'default');
    expect(screen.getByText('Strapi Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Workplace')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
