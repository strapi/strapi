import React, { forwardRef, memo, useCallback, useImperativeHandle, useReducer } from 'react';

import { Tab, TabGroup, TabPanel, TabPanels, Tabs } from '@strapi/design-system';
import { difference } from '@strapi/helper-plugin';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import ContentTypes from '../ContentTypes';
import PermissionsDataManagerProvider from '../PermissionsDataManagerProvider';
import PluginsAndSettings from '../PluginsAndSettings';

import init from './init';
import reducer, { initialState } from './reducer';
import formatPermissionsToAPI from './utils/formatPermissionsToAPI';
import TAB_LABELS from './utils/tabLabels';

const Permissions = forwardRef(({ layout, isFormDisabled, permissions }, ref) => {
  const [{ initialData, layouts, modifiedData }, dispatch] = useReducer(reducer, initialState, () =>
    init(layout, permissions)
  );
  const { formatMessage } = useIntl();

  useImperativeHandle(ref, () => {
    return {
      getPermissions() {
        const collectionTypesDiff = difference(
          initialData.collectionTypes,
          modifiedData.collectionTypes
        );
        const singleTypesDiff = difference(initialData.singleTypes, modifiedData.singleTypes);

        const contentTypesDiff = { ...collectionTypesDiff, ...singleTypesDiff };

        let didUpdateConditions;

        if (isEmpty(contentTypesDiff)) {
          didUpdateConditions = false;
        } else {
          didUpdateConditions = Object.values(contentTypesDiff).some((permission) => {
            return Object.values(permission).some((permissionValue) =>
              has(permissionValue, 'conditions')
            );
          });
        }

        return { permissionsToSend: formatPermissionsToAPI(modifiedData), didUpdateConditions };
      },
      resetForm() {
        dispatch({ type: 'RESET_FORM' });
      },
      setFormAfterSubmit() {
        dispatch({ type: 'SET_FORM_AFTER_SUBMIT' });
      },
    };
  });

  const handleChangeCollectionTypeLeftActionRowCheckbox = (
    pathToCollectionType,
    propertyName,
    rowName,
    value
  ) => {
    dispatch({
      type: 'ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX',
      pathToCollectionType,
      propertyName,
      rowName,
      value,
    });
  };

  const handleChangeCollectionTypeGlobalActionCheckbox = (collectionTypeKind, actionId, value) => {
    dispatch({
      type: 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX',
      collectionTypeKind,
      actionId,
      value,
    });
  };

  const handleChangeConditions = (conditions) => {
    dispatch({ type: 'ON_CHANGE_CONDITIONS', conditions });
  };

  const handleChangeSimpleCheckbox = useCallback(({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE_SIMPLE_CHECKBOX',
      keys: name,
      value,
    });
  }, []);

  const handleChangeParentCheckbox = useCallback(({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX',
      keys: name,
      value,
    });
  }, []);

  return (
    <PermissionsDataManagerProvider
      value={{
        availableConditions: layout.conditions,
        modifiedData,
        onChangeConditions: handleChangeConditions,
        onChangeSimpleCheckbox: handleChangeSimpleCheckbox,
        onChangeParentCheckbox: handleChangeParentCheckbox,
        onChangeCollectionTypeLeftActionRowCheckbox:
          handleChangeCollectionTypeLeftActionRowCheckbox,
        onChangeCollectionTypeGlobalActionCheckbox: handleChangeCollectionTypeGlobalActionCheckbox,
      }}
    >
      <TabGroup
        id="tabs"
        label={formatMessage({
          id: 'Settings.permissions.users.tabs.label',
          defaultMessage: 'Tabs Permissions',
        })}
      >
        <Tabs>
          {TAB_LABELS.map((tabLabel) => (
            <Tab key={tabLabel.id}>
              {formatMessage({ id: tabLabel.labelId, defaultMessage: tabLabel.defaultMessage })}
            </Tab>
          ))}
        </Tabs>
        <TabPanels style={{ position: 'relative' }}>
          <TabPanel>
            <ContentTypes
              layout={layouts.collectionTypes}
              kind="collectionTypes"
              isFormDisabled={isFormDisabled}
            />
          </TabPanel>
          <TabPanel>
            <ContentTypes
              layout={layouts.singleTypes}
              kind="singleTypes"
              isFormDisabled={isFormDisabled}
            />
          </TabPanel>
          <TabPanel>
            <PluginsAndSettings
              layout={layouts.plugins}
              kind="plugins"
              isFormDisabled={isFormDisabled}
            />
          </TabPanel>
          <TabPanel>
            <PluginsAndSettings
              layout={layouts.settings}
              kind="settings"
              isFormDisabled={isFormDisabled}
            />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </PermissionsDataManagerProvider>
  );
});

Permissions.defaultProps = {
  permissions: [],
  layout: {
    conditions: [],
    sections: {
      collectionTypes: {},
      singleTypes: {
        actions: [],
      },
      settings: [],
      plugins: [],
    },
  },
};
Permissions.propTypes = {
  layout: PropTypes.object,
  isFormDisabled: PropTypes.bool.isRequired,
  permissions: PropTypes.array,
};

export default memo(Permissions);
