import { render, screen } from '@tests/utils';

import { DocumentActions, DocumentActionsMenu } from '../DocumentActions';

describe('DocumentActions', () => {});

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

    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More actions' }));

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

    expect(screen.getByRole('button', { name: 'More actions' })).toBeDisabled();
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

    await user.click(screen.getByRole('button', { name: 'More actions' }));

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

    await user.click(screen.getByRole('button', { name: 'More actions' }));

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
            dialog: { type: 'notifcation', title: 'hello world' },
          },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action 1' }));

    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalled();
  });

  it('should render a dialog if the aciton has been pressed and the dialog props are provided', async () => {
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

    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Action 1' }));

    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(screen.getByText('are you sure?')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();

    await user.click(screen.getByRole('menuitem', { name: 'Action 1' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalled();
  });
});
