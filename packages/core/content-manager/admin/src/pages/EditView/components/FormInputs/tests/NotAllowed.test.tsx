import { render, screen } from '@tests/utils';

import { NotAllowedInput } from '../NotAllowed';

describe('<NotAllowedInput />', () => {
  it('renders a disabled text field', () => {
    render(<NotAllowedInput name="test" label="test" type="string" />);

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByPlaceholderText('No permissions to see this field')).toBe(
      screen.getByRole('textbox')
    );
  });
});
