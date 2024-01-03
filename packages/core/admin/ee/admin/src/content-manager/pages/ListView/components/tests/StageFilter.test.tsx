import { render, waitFor } from '@tests/utils';

import { StageFilter } from '../StageFilter';

describe('Content-Manger | List View | Filter | StageFilter', () => {
  it('should display stages', async () => {
    const { user, getByRole, findByText } = render(
      <StageFilter uid="api::address.address" onChange={jest.fn()} />
    );

    await user.click(getByRole('combobox'));

    await findByText('To Review');
  });

  it('should use the stage name as filter value', async () => {
    const spy = jest.fn();
    const { getByText, user, getByRole } = render(
      <StageFilter uid="api::address.address" onChange={spy} />
    );

    await user.click(getByRole('combobox'));
    await user.click(getByText('To Review'));

    await waitFor(() => expect(spy).toHaveBeenCalledWith('To Review'));
  });
});
