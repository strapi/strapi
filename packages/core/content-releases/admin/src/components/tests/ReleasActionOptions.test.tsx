import { fireEvent, screen } from '@testing-library/react';
import { render } from '@tests/utils';

import { ReleaseActionOptions } from '../ReleaseActionOptions';

describe('ReleaseActionOptions', () => {
  it('should render the component', () => {
    const handleChange = jest.fn();
    render(
      <ReleaseActionOptions selected="publish" handleChange={handleChange} name="test-radio" />
    );

    const publishOption = screen.getByRole('radio', { name: 'publish' });
    const unpublishOption = screen.getByRole('radio', { name: 'unpublish' });

    expect(publishOption).toBeInTheDocument();
    expect(publishOption).toBeChecked();
    expect(unpublishOption).toBeInTheDocument();

    fireEvent.click(unpublishOption);
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});
