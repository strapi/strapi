import { render } from '@tests/utils';

import { ReviewWorkflowsStageEE } from '../ReviewWorkflowsColumn';

describe('DynamicTable | ReviewWorkflowsStage', () => {
  test('render stage name', () => {
    const { getByText } = render(<ReviewWorkflowsStageEE color="#4945FF" name="reviewed" />);

    expect(getByText('reviewed')).toBeInTheDocument();
  });
});
