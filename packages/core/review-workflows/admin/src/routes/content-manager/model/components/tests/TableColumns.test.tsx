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

  describe('cellFormatter', () => {
    const ROW = {
      id: 1,
      documentId: 'abc123',
      ref: 'ref-value',
      key: 'key-value',
      strapi_stage: { name: 'reviewed', color: '#4945FF' },
      strapi_assignee: { firstname: 'Kai', lastname: 'Doe' },
    };

    let consoleError: jest.SpyInstance;

    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleError.mockRestore();
    });

    test('renders the stage column for a row that has `ref` and `key` attributes', () => {
      const [stageHeader] = REVIEW_WORKFLOW_COLUMNS;

      const { getByText } = render(<>{stageHeader.cellFormatter(ROW)}</>);

      expect(getByText('reviewed')).toBeInTheDocument();
      expect(consoleError).not.toHaveBeenCalled();
    });

    test('renders the assignee column for a row that has `ref` and `key` attributes', () => {
      const [, assigneeHeader] = REVIEW_WORKFLOW_COLUMNS;

      const { getByText } = render(<>{assigneeHeader.cellFormatter(ROW)}</>);

      expect(getByText('Kai Doe')).toBeInTheDocument();
      expect(consoleError).not.toHaveBeenCalled();
    });
  });
});
