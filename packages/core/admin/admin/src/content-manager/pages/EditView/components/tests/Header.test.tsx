import { render, screen } from '@tests/utils';

import { Header } from '../Header';

describe('Header', () => {
  it('should render the create entry title when isCreating is true', () => {
    const { rerender } = render(<Header isCreating />);

    expect(screen.getByRole('heading', { name: 'Create an entry' })).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(<Header />);

    expect(screen.getByRole('heading', { name: 'Untitled' })).toBeInTheDocument();

    rerender(<Header title="Richmond AFC appoint new manager" />);

    expect(
      screen.getByRole('heading', { name: 'Richmond AFC appoint new manager' })
    ).toBeInTheDocument();
  });

  it('should display the status of the document', () => {
    const { rerender } = render(<Header status="draft" />);

    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(<Header status="published" />);

    expect(screen.getByText('Published')).toBeInTheDocument();

    rerender(<Header status="modified" />);

    expect(screen.getByText('Modified')).toBeInTheDocument();
  });

  it.todo('should display a back button');

  it.todo('should have a menu of document actions');
});
