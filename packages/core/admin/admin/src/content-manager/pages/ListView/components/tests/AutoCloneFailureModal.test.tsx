import * as React from 'react';

import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render as renderRTL, screen } from '@tests/utils';
import { Route } from 'react-router-dom';

import { AutoCloneFailureModal } from '../AutoCloneFailureModal';

import type { Location } from 'history';

const user = userEvent.setup();

let testLocation: Location = null!;

const render = (props: React.ComponentProps<typeof AutoCloneFailureModal>) =>
  renderRTL(<AutoCloneFailureModal {...props} />, {
    renderOptions: {
      wrapper({ children }) {
        return (
          <>
            {children}
            <Route
              path="*"
              render={({ location }) => {
                testLocation = location;

                return null;
              }}
            />
          </>
        );
      },
    },
    initialEntries: ['/content-manager/collection-types/api::model.model?plugins[i18n][locale]=en'],
  });

describe('AutoCloneFailureModal', () => {
  it('renders nothing if there is no entryId', () => {
    render({ entryId: null, onClose: jest.fn(), prohibitedFields: [], pluginQueryParams: '' });

    expect(screen.queryByText(/duplicate/i)).not.toBeInTheDocument();
  });

  it('toggles the modal', async () => {
    const onClose = jest.fn();
    render({ entryId: 1, onClose, prohibitedFields: [], pluginQueryParams: '' });

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the fields that prevent duplication', async () => {
    render({
      entryId: 1,
      onClose: jest.fn(),
      prohibitedFields: [
        [['dynZoneAttrName', 'Unique Component', 'componentAttrName', 'text'], 'unique'],
        [['oneToOneRelation'], 'relation'],
      ],
      pluginQueryParams: 'plugins[i18n][locale]=en',
    });

    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(2);
    screen.getByText(/identical values in a unique field are not allowed/i);
    screen.getByText(/duplicating the relation could remove it/i);

    const uniqueSegments = within(lists[0]).getAllByRole('listitem');
    expect(uniqueSegments).toHaveLength(4);
    within(uniqueSegments[1]).getByText('Unique Component');
    within(uniqueSegments[3]).getByText('text');

    const relationSegments = within(lists[1]).getAllByRole('listitem');
    expect(relationSegments).toHaveLength(1);
    within(relationSegments[0]).getByText('oneToOneRelation');

    // Links to the edit cloned entry page
    await user.click(screen.getByRole('link', { name: /create/i }));
    expect(testLocation.pathname).toBe(
      '/content-manager/collection-types/api::model.model/create/clone/1'
    );
    expect(testLocation.search).toBe('?plugins[i18n][locale]=en');
  });
});
