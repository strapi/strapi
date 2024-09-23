import { Dialog } from '@strapi/design-system';
import { render, screen } from '@tests/utils';

import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('should render the ConfirmDialog with bare minimal props', () => {
    render(<ConfirmDialog onConfirm={() => {}} />, {
      renderOptions: {
        wrapper: (props) => <Dialog.Root defaultOpen {...props} />,
      },
    });

    expect(screen.getByRole('alertdialog', { name: 'Confirmation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Confirmation' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it("should call onConfirm and onClose when the 'Confirm' button is clicked", async () => {
    const onConfirm = jest.fn();
    const { user } = render(<ConfirmDialog onConfirm={onConfirm} />, {
      renderOptions: {
        wrapper: (props) => <Dialog.Root defaultOpen {...props} />,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toBeCalled();
  });

  it('should let me change the title', () => {
    render(<ConfirmDialog onConfirm={() => {}} title="Woh there kid!" />, {
      renderOptions: {
        wrapper: (props) => <Dialog.Root defaultOpen {...props} />,
      },
    });

    expect(screen.getByRole('alertdialog', { name: 'Woh there kid!' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Woh there kid!' })).toBeInTheDocument();
  });

  it('should let me change the content', () => {
    render(
      <ConfirmDialog onConfirm={() => {}}>{"Well, i'd be careful if I were you."}</ConfirmDialog>,
      {
        renderOptions: {
          wrapper: (props) => <Dialog.Root defaultOpen {...props} />,
        },
      }
    );

    expect(screen.getByText("Well, i'd be careful if I were you.")).toBeInTheDocument();
  });

  it('should let me render a complete custom body', () => {
    render(
      <ConfirmDialog onConfirm={() => {}}>
        <h2>WARNING</h2>
      </ConfirmDialog>,
      {
        renderOptions: {
          wrapper: (props) => <Dialog.Root defaultOpen {...props} />,
        },
      }
    );

    expect(screen.getByRole('heading', { name: 'WARNING' })).toBeInTheDocument();
  });
});
