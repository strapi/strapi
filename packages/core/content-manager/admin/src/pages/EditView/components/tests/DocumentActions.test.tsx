import { render, screen } from '@tests/utils';

import { DocumentActions, DocumentActionsMenu } from '../DocumentActions';

describe('DocumentActions', () => {
  it('it should render a single button when there is only one action', () => {
    render(<DocumentActions actions={[{ id: '1', label: 'Action 1', onClick: jest.fn() }]} />);

    expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('should render two buttons when there are two actions', () => {
    render(
      <DocumentActions
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn() },
          { id: '2', label: 'Action 2', onClick: jest.fn() },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action 2' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('should render a menu when there are more than two actions', async () => {
    const { user } = render(
      <DocumentActions
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn() },
          { id: '2', label: 'Action 2', onClick: jest.fn() },
          { id: '3', label: 'Action 3', onClick: jest.fn() },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'More document actions' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More document actions' }));

    expect(screen.getByRole('menuitem', { name: 'Action 3' })).toBeInTheDocument();
  });

  it('should disable the menu when all the actions for the menu are disabled', () => {
    render(
      <DocumentActions
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn() },
          { id: '2', label: 'Action 2', onClick: jest.fn() },
          { id: '3', label: 'Action 3', onClick: jest.fn(), disabled: true },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'More document actions' })).toBeDisabled();
  });

  it('should render a notification if either of the button actions has been pressed and the notification dialog props are provided', async () => {
    const onClick1 = jest.fn();
    const onClick2 = jest.fn();

    const { user } = render(
      <DocumentActions
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick: onClick1,
            dialog: { type: 'notification', title: 'Action 1 pressed!' },
          },
          {
            id: '2',
            label: 'Action 2',
            onClick: onClick2,
            dialog: { type: 'notification', title: 'Action 2 pressed!' },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Action 1' }));

    expect(screen.getByText('Action 1 pressed!')).toBeInTheDocument();
    expect(onClick1).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Action 2' }));

    expect(screen.getByText('Action 2 pressed!')).toBeInTheDocument();
    expect(onClick2).toHaveBeenCalled();
  });

  it('should render a dialog if either of the button actions has been pressed and the dialog props are provided', async () => {
    const onClick = jest.fn();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { user } = render(
      <DocumentActions
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick,
            dialog: {
              type: 'dialog',
              title: 'Confirmation',
              content: <p>Are you sure?</p>,
              onConfirm,
              onCancel,
            },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Action 1' }));

    expect(screen.getByRole('heading', { name: 'Confirmation' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Action 1' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('should render a modal if either of the button actions has been pressed and the modal props are provided', async () => {
    const onClick = jest.fn();
    const onClose = jest.fn();

    const { user } = render(
      <DocumentActions
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick,
            dialog: {
              type: 'modal',
              title: 'hello world',
              content: <p>body</p>,
              footer: <p>footer</p>,
              onClose,
            },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Action 1' }));

    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByText('footer')).toBeInTheDocument();

    expect(onClick).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(onClose).toHaveBeenCalled();
  });
});

describe('DocumentActionsMenu', () => {
  it('should render a menu with the given actions', async () => {
    const { user } = render(
      <DocumentActionsMenu
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn() },
          { id: '2', label: 'Action 2', onClick: jest.fn() },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'More document actions' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More document actions' }));

    expect(screen.getByRole('menuitem', { name: 'Action 1' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Action 2' })).toBeInTheDocument();
  });

  it('should be disabled if all the actions are disabled', () => {
    render(
      <DocumentActionsMenu
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn(), disabled: true },
          { id: '2', label: 'Action 2', onClick: jest.fn(), disabled: true },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'More document actions' })).toBeDisabled();
  });

  it("should render an actions's icon if provided", async () => {
    const { user } = render(
      <DocumentActionsMenu
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn(), icon: <span>icon 1</span> },
          { id: '2', label: 'Action 2', onClick: jest.fn(), icon: <span>icon 2</span> },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More document actions' }));

    expect(screen.getByText('icon 1')).toBeInTheDocument();
    expect(screen.getByText('icon 2')).toBeInTheDocument();
  });

  it("should render the action's variant if provided", async () => {
    const { user } = render(
      <DocumentActionsMenu
        actions={[
          { id: '1', label: 'Action 1', onClick: jest.fn(), variant: 'default' },
          { id: '2', label: 'Action 2', onClick: jest.fn(), variant: 'secondary' },
          { id: '3', label: 'Action 3', onClick: jest.fn(), variant: 'danger' },
          { id: '4', label: 'Action 4', onClick: jest.fn(), variant: 'success' },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More document actions' }));

    expect(screen.getByText('Action 1')).toHaveStyle({ color: '#4945ff' }); // primary600
    expect(screen.getByText('Action 2')).toHaveStyle({ color: 'rgb(50, 50, 77);' }); // neutral800
    expect(screen.getByText('Action 3')).toHaveStyle({ color: '#D02B20' }); // danger600
    expect(screen.getByText('Action 4')).toHaveStyle({ color: 'rgb(50, 128, 72)' }); // success600
  });

  it('should render a notification if action has been pressed and the notification dialog props are provided', async () => {
    const onClick = jest.fn();

    const { user } = render(
      <DocumentActionsMenu
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick,
            dialog: { type: 'notification', title: 'hello world' },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More document actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action 1' }));

    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalled();
  });

  it('should render a dialog if the action has been pressed and the dialog props are provided', async () => {
    const onClick = jest.fn();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { user } = render(
      <DocumentActionsMenu
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick,
            dialog: {
              type: 'dialog',
              title: 'hello world',
              content: <p>are you sure?</p>,
              onConfirm,
              onCancel,
            },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More document actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action 1' }));

    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(screen.getByText('are you sure?')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'More document actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action 1' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('should render a modal if the action has been pressed and the modal props are provided', async () => {
    const onClick = jest.fn();
    const onClose = jest.fn();

    const { user } = render(
      <DocumentActionsMenu
        actions={[
          {
            id: '1',
            label: 'Action 1',
            onClick,
            dialog: {
              type: 'modal',
              title: 'hello world',
              content: <p>body</p>,
              footer: <p>footer</p>,
              onClose,
            },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More document actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action 1' }));

    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByText('footer')).toBeInTheDocument();

    expect(onClick).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(onClose).toHaveBeenCalled();
  });
});
