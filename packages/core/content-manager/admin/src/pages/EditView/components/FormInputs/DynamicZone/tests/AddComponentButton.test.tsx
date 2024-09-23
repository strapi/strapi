import { render as renderRTL } from '@tests/utils';

import { AddComponentButton, AddComponentButtonProps } from '../AddComponentButton';

describe('<AddComponentButton />', () => {
  const render = (props?: Partial<AddComponentButtonProps>) => ({
    ...renderRTL(
      <AddComponentButton onClick={jest.fn()} {...props}>
        test
      </AddComponentButton>
    ),
  });

  it('should render the label by default', () => {
    const { getByRole } = render();

    expect(getByRole('button', { name: 'test' })).toBeInTheDocument();
  });

  it('should call the onClick handler when the button is clicked', async () => {
    const onClick = jest.fn();

    const { getByRole, user } = render({ onClick });

    await user.click(getByRole('button', { name: 'test' }));

    expect(onClick).toHaveBeenCalled();
  });

  it('should not call the onClick handler when the button is disabled', async () => {
    const onClick = jest.fn();

    const { getByRole, user } = render({ onClick, isDisabled: true });

    getByRole('button', { name: 'test' }).hasAttribute('disabled');

    await user.click(getByRole('button', { name: 'test' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
