import { render, screen } from '@tests/utils';

import { NavBrand } from '../NavBrand';

describe('NavBrand', () => {
  it('shows the NavBrand with no action on click', () => {
    render(<NavBrand workplace="Workplace" title="Title" icon={<img src="icon" alt="icon" />} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Workplace')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
