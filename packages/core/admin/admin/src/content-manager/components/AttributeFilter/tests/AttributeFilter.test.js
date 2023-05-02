import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import userEvent from '@testing-library/user-event';

import { AttributeFilter } from '..';

jest.mock('@strapi/helper-plugin', () => ({
    ...jest.requireActual('@strapi/helper-plugin'),
    useRBACProvider: jest.fn().mockReturnValue({
      allPermissions: [
        {
          id: 1,
          action: 'plugin::content-manager.explorer.read',
          subject: 'api::content-type.content-type',
          conditions: [],
          properties: {
            fields: ['id', 'title'],
          },
        },
      ],
    }),
    useTracking: jest.fn().mockReturnValue({ trackUsage: jest.fn() }),
  }));

const FIXTURE_LAYOUT = {
    contentType: {
        attributes: {
            id: {
                type: 'integer',
            },

            title: {
                type: 'text'
            }
        },

        metadatas: {
            id: {
                list: {
                    label: 'ID'
                }
            },

            title: {
                list: {
                    label: 'Title'
                }
            }
        }
    }
}

const ComponentFixture = (props) => {
    return <MemoryRouter>
        <ThemeProvider theme={lightTheme}>
            <IntlProvider locale="en">
                <AttributeFilter layout={FIXTURE_LAYOUT} slug="api::content-type.content-type" {...props} />
            </IntlProvider>
        </ThemeProvider>
    </MemoryRouter>
}

function setup(props) {
    return {
        ...render(<ComponentFixture {...props} />),
        user: userEvent.setup()
    }
}

describe('Content-Manger | AttributeFilter', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    })

    test('Displays the toggle button by default and toggles popover', async () => {
        const { user, getByRole, queryByText } = setup();

        expect(getByRole('button', { name: /filters/i })).toBeInTheDocument();
        expect(queryByText(/select filter/i)).not.toBeInTheDocument();

        await user.click(getByRole('button', { name: /filters/i }))

        expect(queryByText(/select filter/i)).toBeInTheDocument();

        await user.click(getByRole('button', { name: /filters/i }))

        expect(queryByText(/select filter/i)).not.toBeInTheDocument();
    })

    test('Displays allowed attributes', async () => {
        const { user, getByRole } = setup();
        await user.click(getByRole('button', { name: /filters/i }));
        await user.click(getByRole('combobox', { name: /id/i }));

        expect(getByRole('option', { name: /id/i })).toBeInTheDocument();
        expect(getByRole('option', { name: 'Title' })).toBeInTheDocument();
    })
});
