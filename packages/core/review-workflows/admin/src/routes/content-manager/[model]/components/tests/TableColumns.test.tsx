import { render } from '@tests/utils';

import { StageColumn, AssigneeColumn } from '../TableColumns';

describe('TableColumns', () => {
  describe('StageColumn', () => {
    test('render stage name', () => {
      const { getByText } = render(
        <StageColumn
          strapi_stage={{
            color: '#4945FF',
            name: 'reviewed',
          }}
        />
      );

      expect(getByText('reviewed')).toBeInTheDocument();
    });
  });

  describe('AssigneeColumn', () => {
    const USER_FIXTURE = { firstname: 'Kai', lastname: 'Doe' };

    test('render assignee name', () => {
      const { getByText } = render(<AssigneeColumn strapi_assignee={USER_FIXTURE} />);

      expect(getByText('Kai Doe')).toBeInTheDocument();
    });

    test('will use username over first and last name', () => {
      const username = 'Display Name';
      const { getByText } = render(
        <AssigneeColumn strapi_assignee={{ ...USER_FIXTURE, username }} />
      );

      expect(getByText(username)).toBeInTheDocument();
    });
  });
});
