import { render } from '@tests/utils';

import { AddStage } from '../AddStage';

describe('AddStage', () => {
  it('should render a list of stages', () => {
    const { container, getByText } = render(<AddStage>Add stage</AddStage>);

    expect(container).toMatchSnapshot();
    expect(getByText('Add stage')).toBeInTheDocument();
  });
});
