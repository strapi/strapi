import React from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormikProvider, useFormik } from 'formik';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';

import { REDUX_NAMESPACE } from '../../../constants';
import { reducer } from '../../../reducer';
import { WorkflowAttributes } from '../WorkflowAttributes';

const WORKFLOWS_FIXTURE = [
  {
    id: 1,
    name: 'Default',
    contentTypes: ['uid1'],
    stages: [],
  },

  {
    id: 2,
    name: 'Default 2',
    contentTypes: ['uid2'],
    stages: [],
  },
];

const CONTENT_TYPES_FIXTURE = {
  collectionTypes: [
    {
      uid: 'uid1',
      info: {
        displayName: 'Collection CT 1',
      },
    },

    {
      uid: 'uid2',
      info: {
        displayName: 'Collection CT 2',
      },
    },
  ],
  singleTypes: [
    {
      uid: 'single-uid1',
      info: {
        displayName: 'Single CT 1',
      },
    },

    {
      uid: 'single-uid2',
      info: {
        displayName: 'Single CT 2',
      },
    },
  ],
};

const ROLES_FIXTURE = [];

// eslint-disable-next-line react/prop-types
const ComponentFixture = ({ currentWorkflow, ...props } = {}) => {
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: currentWorkflow || WORKFLOWS_FIXTURE[0],
    validateOnChange: false,
  });

  return (
    <FormikProvider value={formik}>
      <WorkflowAttributes {...props} />
    </FormikProvider>
  );
};

// eslint-disable-next-line no-unused-vars
const withMarkup = (query) => (text) =>
  query((content, node) => {
    const hasText = (node) => node.textContent === text;
    const childrenDontHaveText = Array.from(node.children).every((child) => !hasText(child));

    return hasText(node) && childrenDontHaveText;
  });

const setup = ({ collectionTypes, singleTypes, currentWorkflow, ...props } = {}) => ({
  ...render(<ComponentFixture currentWorkflow={currentWorkflow} {...props} />, {
    wrapper({ children }) {
      const store = configureStore({
        reducer,
        preloadedState: {
          [REDUX_NAMESPACE]: {
            serverState: {
              contentTypes: {
                collectionTypes: collectionTypes || CONTENT_TYPES_FIXTURE.collectionTypes,
                singleTypes: singleTypes || CONTENT_TYPES_FIXTURE.singleTypes,
              },
              roles: ROLES_FIXTURE,
              workflow: WORKFLOWS_FIXTURE[0],
              workflows: WORKFLOWS_FIXTURE,
            },

            clientState: {
              currentWorkflow: {
                data: currentWorkflow || WORKFLOWS_FIXTURE[0],
              },
            },
          },
        },
      });

      return (
        <DndProvider backend={HTML5Backend}>
          <Provider store={store}>
            <IntlProvider locale="en" messages={{}}>
              <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
            </IntlProvider>
          </Provider>
        </DndProvider>
      );
    },
  }),
  user: userEvent.setup(),
});

describe('Admin | Settings | Review Workflow | WorkflowAttributes', () => {
  it('should render values', async () => {
    const { getByRole, getByText, user } = setup();

    await waitFor(() => expect(getByText(/workflow name/i)).toBeInTheDocument());

    expect(getByRole('textbox', { name: /workflow name \*/i })).toHaveValue('Default');
    expect(getByText(/1 content type selected/i)).toBeInTheDocument();
    expect(getByRole('textbox')).not.toHaveAttribute('disabled');
    expect(getByRole('combobox', { name: /associated to/i })).not.toHaveAttribute('data-disabled');

    await user.click(getByRole('combobox', { name: /associated to/i }));

    await waitFor(() =>
      expect(getByRole('option', { name: /Collection CT 1/i })).toBeInTheDocument()
    );
  });

  it('should disabled fields if canUpdate = false', async () => {
    const { getByRole } = setup({ canUpdate: false });

    await waitFor(() => expect(getByRole('textbox')).toHaveAttribute('disabled'));

    expect(getByRole('combobox', { name: /associated to/i })).toHaveAttribute('data-disabled');
  });

  it('should not render a collection-type group if there are no collection-types', async () => {
    const { getByRole, queryByRole, user } = setup({
      collectionTypes: [],
      currentWorkflow: {
        ...WORKFLOWS_FIXTURE[0],
        contentTypes: ['single-uid1'],
      },
    });

    await user.click(getByRole('combobox', { name: /associated to/i }));

    await waitFor(() => expect(getByRole('option', { name: /Single Types/i })).toBeInTheDocument());

    expect(queryByRole('option', { name: /Collection Types/i })).not.toBeInTheDocument();
  });

  it('should not render a collection-type group if there are no single-types', async () => {
    const { getByRole, queryByRole, user } = setup({
      singleTypes: [],
    });

    const contentTypesSelect = getByRole('combobox', { name: /associated to/i });

    await user.click(contentTypesSelect);

    await waitFor(() => {
      expect(queryByRole('option', { name: /Single Types/i })).not.toBeInTheDocument();
      expect(getByRole('option', { name: /Collection Types/i })).toBeInTheDocument();
    });
  });

  it('should disabled fields if canUpdate = false', async () => {
    const { getByRole } = setup({ canUpdate: false });

    await waitFor(() => {
      expect(getByRole('textbox')).toHaveAttribute('disabled');
      expect(getByRole('combobox', { name: /associated to/i })).toHaveAttribute('data-disabled');
    });
  });

  it('should not render the assigned content-types notice to the current workflow', async () => {
    const { getByRole, queryByText, user } = setup();

    await waitFor(() =>
      expect(getByRole('combobox', { name: /associated to/i })).toBeInTheDocument()
    );

    const contentTypesSelect = getByRole('combobox', { name: /associated to/i });
    const queryByTextWithMarkup = withMarkup(queryByText);

    await user.click(contentTypesSelect);

    await waitFor(() =>
      expect(queryByTextWithMarkup('(assigned to Default workflow)')).not.toBeInTheDocument()
    );
  });

  it('should render assigned content-types to the other workflows', async () => {
    const { getByRole, getByText, user } = setup();

    await waitFor(() =>
      expect(getByRole('combobox', { name: /associated to/i })).toBeInTheDocument()
    );

    const contentTypesSelect = getByRole('combobox', { name: /associated to/i });
    const getByTextWithMarkup = withMarkup(getByText);

    await user.click(contentTypesSelect);

    await waitFor(() => {
      expect(getByTextWithMarkup('(assigned to Default 2 workflow)')).toBeInTheDocument();
    });
  });

  it('should render assigned content-types of other workflows, when currentWorkflow is not passed', async () => {
    const { getByRole, getByText, user } = setup({
      currentWorkflow: undefined,
    });

    const contentTypesSelect = getByRole('combobox', { name: /associated to/i });
    const getByTextWithMarkup = withMarkup(getByText);

    await user.click(contentTypesSelect);

    await waitFor(() => {
      expect(getByTextWithMarkup('(assigned to Default 2 workflow)')).toBeInTheDocument();
    });
  });
});
