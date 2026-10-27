import { render, screen } from '@tests/utils';

import { InfoItems } from '../InfoItems';

describe('InfoItems', () => {
  it('renders the item each description returns for the props, and skips null', async () => {
    render(
      <InfoItems
        props={{ name: 'Branding' }}
        descriptions={[
          ({ name }) => ({ label: 'Shared with', value: `${name} spaces`, icon: 'globe' }),
          () => null,
        ]}
      />
    );

    expect(await screen.findByText('Shared with')).toBeInTheDocument();
    expect(screen.getByText('Branding spaces')).toBeInTheDocument();
  });
});
