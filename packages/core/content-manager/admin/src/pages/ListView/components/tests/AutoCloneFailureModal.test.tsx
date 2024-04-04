import { within } from '@testing-library/react';
import { render, screen } from '@tests/utils';

import { AutoCloneFailureModalBody } from '../AutoCloneFailureModal';

describe('AutoCloneFailureModalBody', () => {
  it('renders the titles correctly', () => {
    render(<AutoCloneFailureModalBody prohibitedFields={[]} />);

    screen.getByText("This entry can't be duplicated directly.");
    screen.getByText(
      "A new entry will be created with the same content, but you'll have to change the following fields to save it."
    );
  });

  it('shows the fields that prevent duplication', async () => {
    render(
      <AutoCloneFailureModalBody
        prohibitedFields={[
          [['dynZoneAttrName', 'Unique Component', 'componentAttrName', 'text'], 'unique'],
          [['oneToOneRelation'], 'relation'],
        ]}
      />
    );

    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(2);

    const uniqueSegments = within(lists[0]).getAllByRole('listitem');
    expect(uniqueSegments).toHaveLength(4);
    within(uniqueSegments[1]).getByText('Unique Component');
    within(uniqueSegments[3]).getByText('text');

    const relationSegments = within(lists[1]).getAllByRole('listitem');
    expect(relationSegments).toHaveLength(1);
    within(relationSegments[0]).getByText('oneToOneRelation');
  });
});
