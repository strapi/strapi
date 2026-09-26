import { Modal } from '@strapi/design-system';
import { render, screen } from '@tests/utils';

import { PermissionsDataManagerProvider } from '../../hooks/usePermissionsDataManager';
import { ConditionsModal } from '../ConditionsModal';

const AVAILABLE_CONDITIONS = [
  {
    id: 'admin::is-creator',
    displayName: 'Is creator',
    category: 'default',
  },
  {
    id: 'admin::my-condition',
    displayName: 'My condition',
    category: 'my category',
  },
];

const ACTIONS = [
  {
    actionId: 'plugin::content-manager.explorer.read',
    label: 'Read',
    isDisplayed: true,
    hasAllActionsSelected: true,
    pathToConditionsObject: ['collectionTypes', 'api::address.address', 'read'],
  },
];

const renderModal = (onChangeConditions: jest.Mock, conditions: Record<string, boolean> = {}) =>
  render(
    <Modal.Root defaultOpen>
      <ConditionsModal actions={ACTIONS} />
    </Modal.Root>,
    {
      renderOptions: {
        wrapper: ({ children }) => (
          <PermissionsDataManagerProvider
            availableConditions={AVAILABLE_CONDITIONS}
            modifiedData={{
              collectionTypes: {
                'api::address.address': {
                  read: { properties: { enabled: true }, conditions },
                },
              },
              singleTypes: {},
              plugins: {},
              settings: {},
            }}
            onChangeConditions={onChangeConditions}
            onChangeSimpleCheckbox={jest.fn()}
            onChangeParentCheckbox={jest.fn()}
            onChangeCollectionTypeLeftActionRowCheckbox={jest.fn()}
            onChangeCollectionTypeGlobalActionCheckbox={jest.fn()}
          >
            {children}
          </PermissionsDataManagerProvider>
        ),
      },
    }
  );

describe('ConditionsModal', () => {
  it('should apply a condition belonging to a custom category', async () => {
    const onChangeConditions = jest.fn();
    const { user } = renderModal(onChangeConditions);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'My condition' }));
    await user.keyboard('[Escape]');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChangeConditions).toHaveBeenCalledWith({
      'collectionTypes..api::address.address..read': {
        'admin::is-creator': false,
        'admin::my-condition': true,
      },
    });
  });

  it('should not count a selected condition twice', async () => {
    const { user } = renderModal(jest.fn(), { 'admin::my-condition': true });

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Is creator' }));
    await user.keyboard('[Escape]');

    expect(screen.getByRole('combobox')).toHaveTextContent('2 currently selected');
  });
});
