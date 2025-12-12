import { screen, render } from '@tests/utils';

import { ComponentCard } from '@content-manager/admin/pages/EditView/components/FormInputs/DynamicZone/ComponentCard';

describe('ComponentCard', () => {
  it('should call the onClick handler when passed', async () => {
    const onClick = jest.fn();
    const { user } = render(<ComponentCard onClick={onClick}>test</ComponentCard>);
    await user.click(screen.getByText('test'));
    expect(onClick).toHaveBeenCalled();
  });
});
