import React from 'react';

import { Modal } from '@strapi/design-system';
import { render, screen } from '@tests/utils';

import { PermissionsDataManagerProvider } from '../../hooks/usePermissionsDataManager';
import { ConditionsModal } from '../ConditionsModal';

import type { Condition } from '../../../../../../../../shared/contracts/permissions';
import type { PermissionsDataManagerContextValue } from '../../hooks/usePermissionsDataManager';

const IS_CREATOR = 'admin::is-creator';
const SAME_ROLE = 'admin::has-same-role-as-creator';
const CUSTOM = 'admin::my-condition';

const ACTION_PATH = [
  'collectionTypes',
  'api::article.article',
  'plugin::content-manager.explorer.read',
];

const ACTION_KEY = ACTION_PATH.join('..');

const availableConditions: Condition[] = [
  { id: IS_CREATOR, displayName: 'Is creator', category: 'default' },
  { id: SAME_ROLE, displayName: 'Has same role as creator', category: 'default' },
  { id: CUSTOM, displayName: 'My condition', category: 'My Category' },
];

const renderModal = ({
  selected = [],
  onChangeConditions = jest.fn(),
}: {
  selected?: string[];
  onChangeConditions?: PermissionsDataManagerContextValue['onChangeConditions'];
} = {}) => {
  const conditions = {
    [IS_CREATOR]: selected.includes(IS_CREATOR),
    [SAME_ROLE]: selected.includes(SAME_ROLE),
    [CUSTOM]: selected.includes(CUSTOM),
  };

  const modifiedData: PermissionsDataManagerContextValue['modifiedData'] = {
    collectionTypes: {
      'api::article.article': {
        'plugin::content-manager.explorer.read': {
          properties: {
            enabled: true,
          },
          conditions,
        },
      },
    },
    plugins: {},
    settings: {},
    singleTypes: {},
  };

  const view = render(
    <PermissionsDataManagerProvider
      availableConditions={availableConditions}
      modifiedData={modifiedData}
      onChangeConditions={onChangeConditions}
      onChangeSimpleCheckbox={jest.fn()}
      onChangeParentCheckbox={jest.fn()}
      onChangeCollectionTypeLeftActionRowCheckbox={jest.fn()}
      onChangeCollectionTypeGlobalActionCheckbox={jest.fn()}
    >
      <Modal.Root open>
        <ConditionsModal
          actions={[
            {
              actionId: 'plugin::content-manager.explorer.read',
              label: 'Read',
              isDisplayed: true,
              hasAllActionsSelected: true,
              pathToConditionsObject: ACTION_PATH,
            },
          ]}
        />
      </Modal.Root>
    </PermissionsDataManagerProvider>
  );

  return { ...view, onChangeConditions };
};

const toggleCondition = async (user: ReturnType<typeof renderModal>['user'], name: string) => {
  const combobox = screen.getByRole('combobox');

  if (combobox.getAttribute('aria-expanded') !== 'true') {
    await user.click(combobox);
  }

  await user.click(screen.getByRole('option', { name }));
  await user.keyboard('{Escape}');
};

describe('ConditionsModal', () => {
  it('applies a condition from a custom category', async () => {
    const onChangeConditions = jest.fn();
    const { user } = renderModal({ onChangeConditions });

    expect(screen.queryByText(/currently selected/)).not.toBeInTheDocument();

    await toggleCondition(user, 'My condition');

    expect(screen.getByText('1 currently selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChangeConditions).toHaveBeenCalledWith({
      [ACTION_KEY]: {
        [IS_CREATOR]: false,
        [SAME_ROLE]: false,
        [CUSTOM]: true,
      },
    });
  });

  it('removes a condition from a custom category', async () => {
    const onChangeConditions = jest.fn();
    const { user } = renderModal({ selected: [CUSTOM], onChangeConditions });

    expect(screen.getByText('1 currently selected')).toBeInTheDocument();

    await toggleCondition(user, 'My condition');

    expect(screen.queryByText(/currently selected/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChangeConditions).toHaveBeenCalledWith({
      [ACTION_KEY]: {
        [IS_CREATOR]: false,
        [SAME_ROLE]: false,
        [CUSTOM]: false,
      },
    });
  });

  it('keeps an already selected custom-category condition when applying without changes', async () => {
    const onChangeConditions = jest.fn();
    const { user } = renderModal({ selected: [CUSTOM, IS_CREATOR], onChangeConditions });

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChangeConditions).toHaveBeenCalledWith({
      [ACTION_KEY]: {
        [IS_CREATOR]: true,
        [SAME_ROLE]: false,
        [CUSTOM]: true,
      },
    });
  });

  it('does not count a custom-category condition twice when another condition is selected', async () => {
    const onChangeConditions = jest.fn();
    const { user } = renderModal({ selected: [CUSTOM], onChangeConditions });

    expect(screen.getByText('1 currently selected')).toBeInTheDocument();

    await toggleCondition(user, 'Is creator');

    expect(screen.getByText('2 currently selected')).toBeInTheDocument();
    expect(screen.queryByText('3 currently selected')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChangeConditions).toHaveBeenCalledWith({
      [ACTION_KEY]: {
        [IS_CREATOR]: true,
        [SAME_ROLE]: false,
        [CUSTOM]: true,
      },
    });
  });

  it('still applies conditions in the default category', async () => {
    const onChangeConditions = jest.fn();
    const { user } = renderModal({ onChangeConditions });

    await toggleCondition(user, 'Is creator');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChangeConditions).toHaveBeenCalledWith({
      [ACTION_KEY]: {
        [IS_CREATOR]: true,
        [SAME_ROLE]: false,
        [CUSTOM]: false,
      },
    });
  });
});
