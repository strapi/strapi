import { render, screen } from '@tests/utils';

import { CreateActionCE } from '../CreateActionCE';

describe('<CreateAction />', () => {
  test('Does render', () => {
    render(<CreateActionCE />);

    expect(screen.getByRole('button', { name: 'Invite new user' })).toBeInTheDocument();
  });

  test('Calls onClick callback', async () => {
    const onClickSpy = jest.fn();
    const { user } = render(<CreateActionCE onClick={onClickSpy} />);

    await user.click(screen.getByRole('button'));

    expect(onClickSpy).toBeCalledTimes(1);
  });
});
