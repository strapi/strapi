import { render, screen } from '@tests/utils';

import { UseCasePage } from '../UseCasePage';

describe('Admin | UseCasePage', () => {
  it('should not show Other input if select value is not Other', async () => {
    const { queryByTestId, user } = render(<UseCasePage />);

    const selectInput = screen.getByRole('combobox', { name: 'What type of work do you do?' });

    await user.click(selectInput);

    await user.click(screen.getByRole('option', { name: 'Front-end developer' }));

    expect(queryByTestId('other')).not.toBeInTheDocument();
  });

  it('should show Other input if select value is Other', async () => {
    const { getByRole, user } = render(<UseCasePage />);

    const selectInput = screen.getByRole('combobox', { name: 'What type of work do you do?' });

    await user.click(selectInput);

    await user.click(screen.getByRole('option', { name: 'Other' }));

    expect(getByRole('textbox', { name: 'Other' })).toBeInTheDocument();
  });
});
