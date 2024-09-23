import { render, screen } from '@tests/utils';

import { NoContentType } from '../NoContentTypePage';

describe('NoContentType', () => {
  it('renders and matches the snapshot', () => {
    render(<NoContentType />);

    expect(screen.getByRole('heading', { name: 'Content' })).toBeInTheDocument();
    expect(
      screen.getByText(
        "You don't have any content yet, we recommend you to create your first Content-Type."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Create your first Content-type' })
    ).toBeInTheDocument();
  });
});
