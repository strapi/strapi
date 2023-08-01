import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormikProvider, useFormik } from 'formik';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { REDUX_NAMESPACE, STAGE_COLOR_DEFAULT } from '../../../../constants';
import { reducer } from '../../../../reducer';
import { Stage } from '../Stage';

const STAGES_FIXTURE = {
  id: 1,
  index: 0,
};

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

const ROLES_FIXTURE = [
  {
    id: 1,
    code: 'strapi-editor',
    name: 'Editor',
  },

  {
    id: 2,
    code: 'strapi-author',
    name: 'Author',
  },

  {
    id: 3,
    code: 'strapi-super-admin',
    name: 'Super Admin',
  },
];

const ComponentFixture = ({
  // eslint-disable-next-line react/prop-types
  stages = [
    {
      color: STAGE_COLOR_DEFAULT,
      name: 'something',
      permissions: [{ role: 1, action: 'admin::review-workflows.stage.transition' }],
    },
  ],
  ...props
}) => {
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      stages,
    },
    validateOnChange: false,
  });

  return (
    <FormikProvider value={formik}>
      <Stage {...STAGES_FIXTURE} {...props} />
    </FormikProvider>
  );
};

const setup = ({ roles, ...props } = {}) =>
  render(<ComponentFixture {...props} />, {
    wrapper({ children }) {
      const store = createStore(reducer, {
        [REDUX_NAMESPACE]: {
          serverState: {
            contentTypes: CONTENT_TYPES_FIXTURE,
            roles: roles || ROLES_FIXTURE,
            workflow: WORKFLOWS_FIXTURE[0],
            workflows: WORKFLOWS_FIXTURE,
          },

          clientState: {
            currentWorkflow: {
              data: WORKFLOWS_FIXTURE[0],
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
  });

const user = userEvent.setup();

describe('Admin | Settings | Review Workflow | Stage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a stage', async () => {
    const { container, getByRole, queryByRole } = setup();

    expect(queryByRole('textbox')).not.toBeInTheDocument();

    // open accordion; getByRole is not sufficient here, because the accordion
    // does not have better identifiers
    await user.click(container.querySelector('button[aria-expanded]'));

    // Expect the accordion header to have the same value as the textbox
    expect(getByRole('button', { name: /something/i }));
    expect(getByRole('textbox').getAttribute('name')).toBe('stages.0.name');

    // Name
    expect(queryByRole('textbox')).toBeInTheDocument();
    expect(getByRole('textbox').value).toBe('something');

    // Color combobox
    await waitFor(() =>
      expect(getByRole('combobox', { name: /color/i })).toHaveTextContent('Blue')
    );

    // Permissions combobox
    await waitFor(() =>
      expect(
        getByRole('combobox', { name: /roles that can change this stage/i })
      ).toHaveTextContent('Editor')
    );

    expect(
      queryByRole('button', {
        name: /delete stage/i,
      })
    ).not.toBeInTheDocument();
  });

  it('should open the accordion panel if isOpen = true', async () => {
    const { queryByRole } = setup({ isOpen: true });

    await waitFor(() => expect(queryByRole('textbox')).toBeInTheDocument());
  });

  it('should not render the delete button if canDelete=false', async () => {
    const { queryByRole } = setup({ isOpen: true, canDelete: false });

    await waitFor(() =>
      expect(
        queryByRole('button', {
          name: /delete stage/i,
        })
      ).not.toBeInTheDocument()
    );
  });

  it('should not render delete drag button if canUpdate=false', async () => {
    const { queryByRole } = setup({ isOpen: true, canUpdate: false });

    await waitFor(() =>
      expect(
        queryByRole('button', {
          name: /drag/i,
        })
      ).not.toBeInTheDocument()
    );
  });

  it('should not crash on a custom color code', async () => {
    const { getByRole } = setup({
      isOpen: true,
      canDelete: false,
      stages: [
        {
          color: '#FF4945',
          name: 'something',
        },
      ],
    });

    expect(getByRole('textbox').value).toBe('something');
  });

  it('disables all input fields, if canUpdate = false', async () => {
    const { container, getByRole } = setup({ canUpdate: false });

    await user.click(container.querySelector('button[aria-expanded]'));

    // Name
    expect(getByRole('textbox')).toHaveAttribute('disabled');

    // Color
    expect(getByRole('combobox', { name: /color/i })).toHaveAttribute('data-disabled');

    // Permissions
    expect(getByRole('combobox', { name: /roles that can change this stage/i })).toHaveAttribute(
      'data-disabled'
    );
  });

  it('should render a list of all available roles (except super admins)', async () => {
    const { container, getByRole, queryByRole } = setup({ canUpdate: true });

    await user.click(container.querySelector('button[aria-expanded]'));

    await waitFor(() =>
      expect(
        getByRole('combobox', { name: /roles that can change this stage/i })
      ).toBeInTheDocument()
    );

    await user.click(getByRole('combobox', { name: /roles that can change this stage/i }));

    await waitFor(() => expect(getByRole('option', { name: /All roles/i })).toBeInTheDocument());
    await waitFor(() => expect(getByRole('option', { name: /Editor/i })).toBeInTheDocument());
    await waitFor(() => expect(getByRole('option', { name: /Author/i })).toBeInTheDocument());
    await waitFor(() =>
      expect(queryByRole('option', { name: /Super Admin/i })).not.toBeInTheDocument()
    );
  });

  it('should render a no permissions fallback, if no roles are available', async () => {
    const { container, getByText } = setup({
      canUpdate: true,
      roles: [...ROLES_FIXTURE].filter((role) => role.code === 'strapi-super-admin'),
    });

    await user.click(container.querySelector('button[aria-expanded]'));

    await waitFor(() =>
      expect(getByText(/you don’t have the permission to see roles/i)).toBeInTheDocument()
    );
  });
});
