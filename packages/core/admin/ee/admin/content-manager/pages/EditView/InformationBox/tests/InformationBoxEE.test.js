import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { InformationBoxEE } from '../InformationBoxEE';

const STAGE_ATTRIBUTE_NAME = 'strapi_reviewWorkflows_stage';
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
      workflows: {
        isLoading: false,
        data: [
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
      },
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

const ComponentFixture = (props) => {
  const store = createStore((state = {}) => state, {});

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en" defaultLocale="en">
          <ThemeProvider theme={lightTheme}>
            <InformationBoxEE {...props} />
          </ThemeProvider>
        </IntlProvider>
      </QueryClientProvider>
    </Provider>
  );
};

const setup = (props) => {
  return render(<ComponentFixture {...props} />);
};

describe('EE | Content Manager | EditView | InformationBox', () => {
  it('renders the title and body of the Information component', () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {},
      isCreatingEntry: true,
      layout: { uid: 'api::articles:articles' },
    });

    const { getByText } = setup();

    expect(getByText('Information')).toBeInTheDocument();
    expect(getByText('Last update')).toBeInTheDocument();
  });

  it('renders no select input, if no workflow stage is assigned to the entity', () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {},
      layout: { uid: 'api::articles:articles' },
    });

    const { queryByRole } = setup();

    expect(queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders an error, if no workflow stage is assigned to the entity', () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [STAGE_ATTRIBUTE_NAME]: null,
      },
      layout: { uid: 'api::articles:articles' },
    });

    const { getByText, queryByRole } = setup();

    expect(getByText(/select a stage/i)).toBeInTheDocument();
    expect(queryByRole('combobox')).toBeInTheDocument();
  });

  it('does not render the select input, if the entity is created', () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [STAGE_ATTRIBUTE_NAME]: STAGE_FIXTURE,
      },
      isCreatingEntry: true,
      layout: { uid: 'api::articles:articles' },
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
      layout: { uid: 'api::articles:articles' },
    });

    const { queryByRole } = setup();
    const select = queryByRole('combobox');

    expect(select).toBeInTheDocument();
  });

  it('renders a select input, if a workflow stage is assigned to the entity', () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [STAGE_ATTRIBUTE_NAME]: STAGE_FIXTURE,
      },
      isCreatingEntry: false,
      layout: { uid: 'api::articles:articles' },
    });

    const { queryByRole, getByText } = setup();
    const select = queryByRole('combobox');

    expect(select).toBeInTheDocument();
    expect(getByText('Stage 1')).toBeInTheDocument();

    fireEvent.mouseDown(select);

    expect(getByText('Stage 2')).toBeInTheDocument();
  });
});
