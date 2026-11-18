import { fireEvent, screen } from '@testing-library/react';
import { render } from '@tests/utils';

import { ReleaseActionOptions } from '../ReleaseActionOptions';

describe('ReleaseActionOptions', () => {
  it('should render the component', () => {
    const onChange = jest.fn();
    render(<ReleaseActionOptions selected="publish" onChange={onChange} name="test-radio" />);

    const publishOption = screen.getByRole('radio', { name: 'Publish' });
    const unpublishOption = screen.getByRole('radio', { name: 'Unpublish' });

    expect(publishOption).toBeInTheDocument();
    expect(publishOption).toBeChecked();
    expect(unpublishOption).toBeInTheDocument();

    fireEvent.click(unpublishOption);
    expect(onChange).toHaveBeenCalledWith('unpublish');
  });
});
