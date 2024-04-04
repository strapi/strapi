import { render, screen } from '@tests/utils';

import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('should render the ConfirmDialog with bare minimal props', () => {
    render(<ConfirmDialog onConfirm={() => {}} onClose={() => {}} isOpen={true} />);

    expect(screen.getByRole('dialog', { name: 'Confirmation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Confirmation' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it("should call onConfirm and onClose when the 'Confirm' button is clicked", async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const { user } = render(
      <ConfirmDialog onConfirm={onConfirm} onClose={onClose} isOpen={true} />
    );

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toBeCalled();
    expect(onClose).toBeCalled();
  });

  it("should call onClose when the 'Cancel' button is clicked", async () => {
    const onClose = jest.fn();
    const { user } = render(<ConfirmDialog onConfirm={() => {}} onClose={onClose} isOpen={true} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toBeCalled();
  });

  it('should not render if isOpen is false', () => {
    render(<ConfirmDialog onConfirm={() => {}} onClose={() => {}} isOpen={false} />);

    expect(screen.queryByRole('dialog', { name: 'Confirmation' })).not.toBeInTheDocument();
  });

  it('should let me change the title', () => {
    render(
      <ConfirmDialog onConfirm={() => {}} onClose={() => {}} isOpen={true} title="Woh there kid!" />
    );

    expect(screen.getByRole('dialog', { name: 'Woh there kid!' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Woh there kid!' })).toBeInTheDocument();
  });

  it('should let me change the content', () => {
    render(
      <ConfirmDialog onConfirm={() => {}} onClose={() => {}} isOpen={true}>
        {"Well, i'd be careful if I were you."}
      </ConfirmDialog>
    );

    expect(screen.getByText("Well, i'd be careful if I were you.")).toBeInTheDocument();
  });

  it('should let me render a complete custom body', () => {
    render(
      <ConfirmDialog onConfirm={() => {}} onClose={() => {}} isOpen={true}>
        <h2>WARNING</h2>
      </ConfirmDialog>
    );

    expect(screen.getByRole('heading', { name: 'WARNING' })).toBeInTheDocument();
  });
});
