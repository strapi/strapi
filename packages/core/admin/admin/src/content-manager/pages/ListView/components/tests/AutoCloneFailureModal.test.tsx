import * as React from 'react';

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
    initialEntries: ['/content-manager/collection-types/api::model.model'],
  });

describe('AutoCloneFailureModal', () => {
  it('renders nothing if there is no entryId', () => {
    render({ entryId: null, onClose: jest.fn(), prohibitedFields: [] });

    expect(screen.queryByText(/duplicate/i)).not.toBeInTheDocument();
  });

  it('toggles the modal', async () => {
    const onClose = jest.fn();
    render({ entryId: 1, onClose, prohibitedFields: [] });

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
    });

    expect(screen.getByText(/duplicating the relation would remove it/i)).toBeInTheDocument();
    expect(
      screen.getByText(/identical values in a unique field are not allowed/i)
    ).toBeInTheDocument();

    // Links to the edit cloned entry page
    await user.click(screen.getByRole('link', { name: /create/i }));
    expect(testLocation.pathname).toBe(
      '/content-manager/collection-types/api::model.model/create/clone/1'
    );
  });
});
