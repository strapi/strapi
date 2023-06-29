import * as React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { useCMEditViewDataManager, RBACContext } from '@strapi/helper-plugin';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { useReviewWorkflows } from '../../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows';
import { InformationBoxEE } from '../InformationBoxEE';

const STAGE_ATTRIBUTE_NAME = 'strapi_stage';
const STAGE_FIXTURE = {
  id: 1,
  color: '#4945FF',
  name: 'Stage 1',
  worklow: 1,
};

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(),
  useNotification: jest.fn(() => ({
    toggleNotification: jest.fn(),
  })),
}));

jest.mock(
  '../../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows',
  () => ({
    useReviewWorkflows: jest.fn(() => ({
      isLoading: false,
      workflows: [
        {
          stages: [
            {
              id: 1,
              color: '#4945FF',
              name: 'Stage 1',
            },
            {
              id: 2,
              color: '#4945FF',
              name: 'Stage 2',
            },
          ],
        },
      ],
    })),
  })
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const ComponentFixture = (props) => <InformationBoxEE {...props} />;

const setup = (props) => ({
  ...render(<ComponentFixture {...props} />, {
    wrapper({ children }) {
      const store = createStore((state = {}) => state, {
        admin_app: {
          permissions: fixtures.permissions.app,
        },
      });

      // eslint-disable-next-line react-hooks/rules-of-hooks
      const rbacContextValue = React.useMemo(
        () => ({
          allPermissions: fixtures.permissions.allPermissions,
        }),
        []
      );

      return (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <IntlProvider locale="en" defaultLocale="en">
              <ThemeProvider theme={lightTheme}>
                <RBACContext.Provider value={rbacContextValue}>{children}</RBACContext.Provider>
              </ThemeProvider>
            </IntlProvider>
          </QueryClientProvider>
        </Provider>
      );
    },
  }),
  user: userEvent.setup(),
});

describe('EE | Content Manager | EditView | InformationBox', () => {
  it('renders the title and body of the Information component', () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {},
      isCreatingEntry: true,
      layout: { uid: 'api::articles:articles', options: { reviewWorkflows: true } },
    });

    const { getByText } = setup();

    expect(getByText('Information')).toBeInTheDocument();
    expect(getByText('Last update')).toBeInTheDocument();
  });

  it('filters workflows based on the model uid', () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {},
      isCreatingEntry: true,
      layout: { uid: 'api::articles:articles', options: { reviewWorkflows: true } },
    });

    expect(useReviewWorkflows).toHaveBeenCalledWith({
      filters: { contentTypes: 'api::articles:articles' },
    });
  });

  it('renders no select input, if no workflow stage is assigned to the entity', () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {},
      layout: { uid: 'api::articles:articles', options: { reviewWorkflows: false } },
    });

    const { queryByRole } = setup();

    expect(queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('does not render the select input, if the entity is being created', () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [STAGE_ATTRIBUTE_NAME]: STAGE_FIXTURE,
      },
      isCreatingEntry: true,
      layout: { uid: 'api::articles:articles', options: { reviewWorkflows: true } },
    });

    const { queryByRole } = setup();
    const select = queryByRole('combobox');

    expect(select).not.toBeInTheDocument();
  });

  it('renders an enabled select input, if the entity is edited', () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [STAGE_ATTRIBUTE_NAME]: STAGE_FIXTURE,
      },
      isCreatingEntry: false,
      layout: { uid: 'api::articles:articles', options: { reviewWorkflows: true } },
    });

    const { queryByRole } = setup();
    const select = queryByRole('combobox');

    expect(select).toBeInTheDocument();
  });

  it('renders a select input, if a workflow stage is assigned to the entity', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [STAGE_ATTRIBUTE_NAME]: STAGE_FIXTURE,
      },
      isCreatingEntry: false,
      layout: { uid: 'api::articles:articles', options: { reviewWorkflows: true } },
    });

    const { getByRole, getByText, user } = setup();

    expect(getByRole('combobox')).toBeInTheDocument();
    expect(getByText('Stage 1')).toBeInTheDocument();

    await user.click(getByRole('combobox'));

    expect(getByText('Stage 2')).toBeInTheDocument();
  });
});
