import React from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormikProvider, useFormik } from 'formik';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';

import { Stage as StageT } from '../../../../../../../../../shared/contracts/review-workflows';
import { AdminRole } from '../../../../../../../../../shared/contracts/shared';
import { REDUX_NAMESPACE, STAGE_COLOR_DEFAULT } from '../../constants';
import { reducer } from '../../reducer';
import { Stage, StageProps } from '../Stage';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => jest.fn()),
}));

const STAGES_FIXTURE = {
  id: 1,
  index: 0,
};

const WORKFLOWS_FIXTURE = [
  {
    id: 1,
    name: 'Default',
    contentTypes: ['uid1'],
    stages: [
      {
        id: 1,
        name: 'Stage 1',
        permissions: [],
      },
    ],
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

type ComponentProps = { stages?: Partial<StageT>[] } & StageProps;

const ComponentFixture = ({
  // eslint-disable-next-line react/prop-types
  stages = [
    {
      color: STAGE_COLOR_DEFAULT,
      name: 'something',
      permissions: [
        {
          id: 1,
          role: 1,
          action: 'admin::review-workflows.stage.transition',
          actionParameters: {},
        },
      ],
    },
  ],
  ...props
}: ComponentProps) => {
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      stages,
    },
    validateOnChange: false,
    onSubmit: () => {},
  });

  return (
    <FormikProvider value={formik}>
      <Stage {...STAGES_FIXTURE} {...props} />
    </FormikProvider>
  );
};

type Setup = { roles?: AdminRole[] } & Partial<ComponentProps>;
const setup = ({ roles, ...props }: Setup = {}) => {
  const componentFixtureProps: ComponentProps = {
    id: 1,
    index: 0,
    canDelete: true,
    canReorder: true,
    canUpdate: true,
    isOpen: false,
    stagesCount: 0,
    ...props,
  };

  return {
    ...render(<ComponentFixture {...componentFixtureProps} />, {
      wrapper({ children }) {
        const store = configureStore({
          reducer,
          preloadedState: {
            // @ts-expect-error - Since we are passing the local ReviewWorkflow reducer, REDUX_NAMESPACE can't be set as part of the preloadedState
            [REDUX_NAMESPACE]: {
              serverState: {
                contentTypes: CONTENT_TYPES_FIXTURE,
                roles: roles ?? ROLES_FIXTURE,
                workflow: WORKFLOWS_FIXTURE[0],
                workflows: WORKFLOWS_FIXTURE,
              },

              clientState: {
                currentWorkflow: {
                  data: WORKFLOWS_FIXTURE[0],
                },
              },
            },
          },
          middleware: (getDefaultMiddleware: any) =>
            getDefaultMiddleware({
              // Disable timing checks for test env
              immutableCheck: false,
              serializableCheck: false,
            }),
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
  };
};

describe('Admin | Settings | Review Workflow | Stage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a stage', async () => {
    const { container, getByRole, queryByRole, user } = setup();

    expect(queryByRole('textbox')).not.toBeInTheDocument();

    // open accordion; getByRole is not sufficient here, because the accordion
    // does not have better identifiers
    // eslint-disable-next-line testing-library/no-node-access
    const button = container.querySelector('button[aria-expanded]');
    if (button) {
      await user.click(button);
    }

    // Expect the accordion header to have the same value as the textbox
    expect(getByRole('button', { name: /something/i }));
    expect(getByRole('textbox')).toHaveAttribute('name', 'stages.0.name');

    // Name
    expect(getByRole('textbox')).toBeInTheDocument();
    expect(getByRole('textbox')).toHaveValue('something');

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

    expect(getByRole('button', { name: /apply to all stages/i })).toBeInTheDocument();
  });

  it('should open the accordion panel if isOpen = true', async () => {
    setup({ isOpen: true });

    const textboxEl = await screen.findByRole('textbox');

    expect(textboxEl).toBeInTheDocument();
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

  it('should render duplicate stage if canUpdate = true', async () => {
    const { getByRole, user } = setup({ isOpen: true, canUpdate: true });

    await user.click(getByRole('button', { name: /more actions/i }));
    const duplicateStageEl = await screen.findByText('Duplicate stage');

    expect(duplicateStageEl).toBeInTheDocument();
  });

  it('should render delete if canDelete = true', async () => {
    const { getByRole, user } = setup({ isOpen: true, canDelete: true });

    await user.click(getByRole('button', { name: /more actions/i }));
    const deleteEl = await screen.findByText('Delete');

    expect(deleteEl).toBeInTheDocument();
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

    expect(getByRole('textbox')).toHaveValue('something');
  });

  it('disables all input fields, if canUpdate = false', async () => {
    const { getByRole } = setup({ canUpdate: false, isOpen: true });

    // Name
    await waitFor(() => expect(getByRole('textbox')).toBeDisabled());

    // Color
    expect(getByRole('combobox', { name: /color/i })).toHaveAttribute('data-disabled');

    // Permissions
    expect(getByRole('combobox', { name: /roles that can change this stage/i })).toHaveAttribute(
      'data-disabled'
    );

    expect(getByRole('button', { name: /apply to all stages/i })).toHaveAttribute('aria-disabled');
  });

  it('should render a list of all available roles (except super admins)', async () => {
    const { getByRole, queryByRole, user } = setup({ canUpdate: true, isOpen: true });

    const comboboxEl = await screen.findByRole('combobox', {
      name: /roles that can change this stage/i,
    });

    expect(comboboxEl).toBeInTheDocument();

    await user.click(getByRole('combobox', { name: /roles that can change this stage/i }));

    const allRolesOptionEl = await screen.findByRole('option', { name: /All roles/i });
    const editorOptionEl = await screen.findByRole('option', { name: /Editor/i });
    const authorOptionEl = await screen.findByRole('option', { name: /Author/i });

    expect(allRolesOptionEl).toBeInTheDocument();
    expect(editorOptionEl).toBeInTheDocument();
    expect(authorOptionEl).toBeInTheDocument();
    await waitFor(() =>
      expect(queryByRole('option', { name: /Super Admin/i })).not.toBeInTheDocument()
    );
  });

  it('should render a no permissions fallback, if no roles are available', async () => {
    setup({
      canUpdate: true,
      isOpen: true,
      roles: [...ROLES_FIXTURE].filter((role) => role.code === 'strapi-super-admin') as AdminRole[],
    });

    const permissionRolesTextEl = await screen.findByText(
      /you don’t have the permission to see roles/i
    );
    expect(permissionRolesTextEl).toBeInTheDocument();
  });
});
