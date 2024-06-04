import { Form } from '@strapi/admin/strapi-admin';
import { render, screen, server, waitFor } from '@tests/utils';
import { rest } from 'msw';

import { Stage } from '../../../../../../shared/contracts/review-workflows';
import { STAGE_COLOR_DEFAULT } from '../../../../constants';
import { Stages, StagesProps } from '../Stages';

const STAGES_FIXTURE: Stage[] = [
  {
    id: 1,
    color: STAGE_COLOR_DEFAULT,
    name: 'stage-1',
    permissions: [
      {
        id: 1,
        role: 1,
        action: 'admin::review-workflows.stage.transition',
        actionParameters: {},
      },
    ],
    createdAt: new Date().toDateString(),
    updatedAt: new Date().toDateString(),
    __temp_key__: 'a0',
  },
  {
    id: 2,
    color: STAGE_COLOR_DEFAULT,
    name: 'stage-2',
    permissions: [],
    createdAt: new Date().toDateString(),
    updatedAt: new Date().toDateString(),
    __temp_key__: 'a1',
  },
];

const setup = ({
  initialValues = {
    stages: STAGES_FIXTURE.slice(0, 1),
  },
  ...props
}: StagesProps & {
  initialValues?: Record<string, any>;
} = {}) => {
  return render(<Stages canDelete canUpdate {...props} />, {
    renderOptions: {
      wrapper: ({ children }) => (
        <Form method="PUT" initialValues={initialValues}>
          {children}
        </Form>
      ),
    },
  });
};

describe('Stages', () => {
  it('should render a list of stages', () => {
    setup({
      initialValues: {
        stages: STAGES_FIXTURE,
      },
    });

    STAGES_FIXTURE.forEach((stage) => {
      expect(screen.getByRole('button', { name: stage.name })).toBeInTheDocument();
    });
  });

  it('should render a "add new stage" button & append a new stage when clicking', async () => {
    const { user } = setup({
      initialValues: {
        stages: STAGES_FIXTURE,
      },
    });

    expect(screen.getByRole('button', { name: 'Add new stage' })).toBeInTheDocument();

    expect(screen.getAllByRole('button').length).toBe(7);

    await user.click(screen.getByRole('button', { name: 'Add new stage' }));

    expect(screen.getAllByRole('button').length).toBe(10);
  });

  it('should not render the "add stage" button if canUpdate = false', () => {
    setup({ canUpdate: false });

    expect(screen.queryByRole('button', { name: 'Add new stage' })).not.toBeInTheDocument();
  });

  it('should render a stage', async () => {
    const { user } = setup();

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'stage-1' }));

    expect(screen.getByRole('textbox', { name: 'Stage name' })).toHaveAttribute(
      'name',
      'stages.0.name'
    );
    expect(screen.getByRole('textbox', { name: 'Stage name' })).toHaveValue('stage-1');

    // Color combobox
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /color/i })).toHaveTextContent('Blue')
    );

    // Permissions combobox
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: /roles that can change this stage/i })
      ).toHaveTextContent('Editor')
    );

    expect(screen.getByRole('button', { name: /apply to all stages/i })).toBeInTheDocument();
  });

  it('should not render the delete button if canDelete=false', async () => {
    const { user } = setup({ canDelete: false });

    await user.click(screen.getByRole('button', { name: 'stage-1' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', {
          name: /delete stage/i,
        })
      ).not.toBeInTheDocument()
    );
  });

  it('should not render delete drag button if canUpdate=false', async () => {
    const { user } = setup({ canUpdate: false });

    await user.click(screen.getByRole('button', { name: 'stage-1' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('button', {
          name: /drag/i,
        })
      ).not.toBeInTheDocument()
    );
  });

  it('should render duplicate stage if canUpdate = true', async () => {
    const { user } = setup({ canUpdate: true });

    await user.click(screen.getByRole('button', { name: 'stage-1' }));
    await user.click(screen.getByRole('button', { name: /more actions/i }));
    const duplicateStageEl = await screen.findByText('Duplicate stage');

    expect(duplicateStageEl).toBeInTheDocument();
  });

  it('should render delete if canDelete = true', async () => {
    const { user } = setup({
      canDelete: true,
      initialValues: {
        stages: STAGES_FIXTURE,
      },
    });

    await user.click(screen.getByRole('button', { name: 'stage-1' }));
    await user.click(screen.getAllByRole('button', { name: /more actions/i })[0]);
    const deleteEl = await screen.findByText('Delete');

    expect(deleteEl).toBeInTheDocument();
  });

  it('should not crash on a custom color code', async () => {
    const { user } = setup({
      canDelete: false,
      initialValues: {
        stages: [
          {
            color: '#FF4945',
            name: 'stage-1',
            __temp_key__: 'a0',
          },
        ],
      },
    });

    await user.click(screen.getByRole('button', { name: 'stage-1' }));
    expect(screen.getByRole('textbox')).toHaveValue('stage-1');
  });

  it('disables all input fields, if canUpdate = false', async () => {
    const { user } = setup({ canUpdate: false });

    await user.click(screen.getByRole('button', { name: 'stage-1' }));

    // Name
    await waitFor(() => expect(screen.getByRole('textbox')).toBeDisabled());

    // Color
    expect(screen.getByRole('combobox', { name: /color/i })).toHaveAttribute('data-disabled');

    // Permissions
    expect(
      screen.getByRole('combobox', { name: /roles that can change this stage/i })
    ).toHaveAttribute('data-disabled');

    expect(screen.getByRole('button', { name: /apply to all stages/i })).toHaveAttribute(
      'aria-disabled'
    );
  });

  it('should render a list of all available roles (except super admins)', async () => {
    const { getByRole, queryByRole, user } = setup({ canUpdate: true });

    await user.click(screen.getByRole('button', { name: 'stage-1' }));

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
    server.use(
      rest.get('/admin/roles', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [],
          })
        );
      })
    );

    const { user } = setup({
      canUpdate: true,
    });

    await user.click(screen.getByRole('button', { name: 'stage-1' }));

    await screen.findAllByText(/you don’t have the permission to see roles/i);
  });
});
