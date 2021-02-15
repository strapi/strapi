import React, {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useReducer,
} from 'react';
import PropTypes from 'prop-types';
import { Tabs } from '../../../../../../admin/src/components/Roles';
import { roleTabsLabel as TAB_LABELS } from '../../../../../../admin/src/utils';
import { PermissionsDataManagerProvider } from '../contexts/PermissionsDataManagerContext';
import ContentTypes from '../ContentTypes';
import PluginsAndSettings from '../PluginsAndSettings';
import layout from '../temp/fakeData';
import formatLayoutForSettingsAndPlugins from './utils/formatLayoutForSettingsAndPlugins';
import init from './init';
import reducer, { initialState } from './reducer';

const Permissions = forwardRef(({ layout }, ref) => {
  const [{ modifiedData }, dispatch] = useReducer(reducer, initialState, () => init(layout));

  useImperativeHandle(ref, () => {
    return {
      getPermissions: () => {
        console.log('todo');
      },
      resetForm: () => {
        console.log('todo');
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

  const pluginsSectionLayout = useMemo(() => {
    return formatLayoutForSettingsAndPlugins(layout.sections.plugins, 'plugin');
  }, [layout.sections.plugins]);

  const settingsSectionLayout = useMemo(() => {
    return formatLayoutForSettingsAndPlugins(layout.sections.settings, 'category');
  }, [layout.sections.settings]);

  return (
    <PermissionsDataManagerProvider
      value={{
        modifiedData,
        onChangeSimpleCheckbox: handleChangeSimpleCheckbox,
        onChangeParentCheckbox: handleChangeParentCheckbox,
        onChangeCollectionTypeLeftActionRowCheckbox: handleChangeCollectionTypeLeftActionRowCheckbox,
        onChangeCollectionTypeGlobalActionCheckbox: handleChangeCollectionTypeGlobalActionCheckbox,
      }}
    >
      <Tabs tabsLabel={TAB_LABELS}>
        <ContentTypes layout={layout.sections.collectionTypes} kind="collectionTypes" />
        <ContentTypes layout={layout.sections.singleTypes} kind="singleTypes" />
        <PluginsAndSettings layout={pluginsSectionLayout} kind="plugins" />
        <PluginsAndSettings layout={settingsSectionLayout} kind="settings" />
      </Tabs>
    </PermissionsDataManagerProvider>
  );
});

Permissions.defaultProps = {
  layout,
};
Permissions.propTypes = {
  // Todo
  layout: PropTypes.object,
};

export default memo(Permissions);
