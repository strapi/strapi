import { render } from '@tests/utils';

import { REVIEW_WORKFLOW_COLUMNS } from '../../constants';
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

describe('REVIEW_WORKFLOW_COLUMNS', () => {
  // Call the formatter during render, like the ListView does
  type Column = (typeof REVIEW_WORKFLOW_COLUMNS)[number];

  const renderCell = (column: Column, row: Parameters<Column['cellFormatter']>[0]) => {
    const Cell = () => <>{column.cellFormatter(row)}</>;

    return render(<Cell />);
  };

  const ROW_FIXTURE = {
    id: 1,
    documentId: '123',
    strapi_stage: { color: '#4945FF', name: 'reviewed' },
    strapi_assignee: { firstname: 'Kai', lastname: 'Doe' },
    ref: 'some-ref',
    key: 'some-key',
  };

  test('render the stage cell for a row that has attributes named `ref` and `key`', () => {
    const { getByText } = renderCell(REVIEW_WORKFLOW_COLUMNS[0], ROW_FIXTURE);

    expect(getByText('reviewed')).toBeInTheDocument();
  });

  test('render the assignee cell for a row that has attributes named `ref` and `key`', () => {
    const { getByText } = renderCell(REVIEW_WORKFLOW_COLUMNS[1], ROW_FIXTURE);

    expect(getByText('Kai Doe')).toBeInTheDocument();
  });
});
