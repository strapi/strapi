import { render } from '@tests/utils';

import { ReviewWorkflowsAssigneeEE } from '../ReviewWorkflowsAssigneeEE';

const USER_FIXTURE = { firstname: 'Kai', lastname: 'Doe' };

describe('Content Manager | List View | ReviewWorkflowsAssignee', () => {
  test('render assignee name', () => {
    const { getByText } = render(<ReviewWorkflowsAssigneeEE user={USER_FIXTURE} />);

    expect(getByText('Kai Doe')).toBeInTheDocument();
  });

  test('will use username over first and last name', () => {
    const username = 'Display Name';
    const { getByText } = render(
      <ReviewWorkflowsAssigneeEE user={{ ...USER_FIXTURE, username }} />
    );

    expect(getByText(username)).toBeInTheDocument();
  });
});
