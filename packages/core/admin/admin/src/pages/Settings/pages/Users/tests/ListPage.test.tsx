import { render } from '@tests/utils';

import { ListPageCE } from '../ListPage';

describe('Users | ListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a list of users', async () => {
    const { findByText } = render(<ListPageCE />);

    await findByText('John');
    await findByText('Kai');
  });

  it('renders the given banner above the users', async () => {
    const { findByText } = render(<ListPageCE banner={<p>License usage banner</p>} />);

    await findByText('License usage banner');
    await findByText('John');
  });
});
