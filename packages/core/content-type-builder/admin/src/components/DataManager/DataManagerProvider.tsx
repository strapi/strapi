import * as React from 'react';

import {
  useTracking,
  useStrapiApp,
  useNotification,
  useAppInfo,
  useFetchClient,
  useAuth,
  adminApi,
  useGuidedTour,
  GUIDED_TOUR_REQUIRED_ACTIONS,
} from '@strapi/admin/strapi-admin';
import groupBy from 'lodash/groupBy';
import isEqual from 'lodash/isEqual';
import mapValues from 'lodash/mapValues';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';

import { getTrad } from '../../utils/getTrad';
import { useAutoReloadOverlayBlocker } from '../AutoReloadOverlayBlocker';
import { useFormModalNavigation } from '../FormModalNavigation/useFormModalNavigation';

import { DataManagerContext, type DataManagerContextValue } from './DataManagerContext';
import { actions, initialState, type State } from './reducer';
import { useServerRestartWatcher } from './useServerRestartWatcher';
import { sortContentType, stateToRequestData } from './utils/cleanData';
import { retrieveComponentsThatHaveComponents } from './utils/retrieveComponentsThatHaveComponents';
import { retrieveNestedComponents } from './utils/retrieveNestedComponents';
import { retrieveSpecificInfoFromComponents } from './utils/retrieveSpecificInfoFromComponents';

import type { ContentTypes, ContentType, Components } from '../../types';
import type { FormAPI } from '../../utils/formAPI';
import type { Internal } from '@strapi/types';

interface DataManagerProviderProps {
  children: React.ReactNode;
}

const selectState = (state: Record<string, unknown>) =>
  (state['content-type-builder_dataManagerProvider'] || initialState) as State;

const DataManagerProvider = ({ children }: DataManagerProviderProps) => {
  const dispatch = useDispatch();
  const state = useSelector(selectState);
  const dispatchGuidedTour = useGuidedTour('DataManagerProvider', (s) => s.dispatch);

  const {
    components,
    contentTypes,
    reservedNames,
    initialComponents,
    initialContentTypes,
    isLoading,
  } = state.current;

  const { toggleNotification } = useNotification();
  const { lockAppWithAutoreload, unlockAppWithAutoreload } = useAutoReloadOverlayBlocker();
  const serverRestartWatcher = useServerRestartWatcher();

  const getPlugin = useStrapiApp('DataManagerProvider', (state) => state.getPlugin);
  const plugin = getPlugin('content-type-builder');
  const autoReload = useAppInfo('DataManagerProvider', (state) => state.autoReload);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const refetchPermissions = useAuth('DataManagerProvider', (state) => state.refetchPermissions);
  const { onCloseModal } = useFormModalNavigation();

  const [isSaving, setIsSaving] = React.useState(false);

  const isModified = React.useMemo(() => {
    return !(isEqual(components, initialComponents) && isEqual(contentTypes, initialContentTypes));
  }, [components, contentTypes, initialComponents, initialContentTypes]);

  const fetchClient = useFetchClient();

  const isInDevelopmentMode = autoReload;

  const getDataRef = React.useRef<any>();

  getDataRef.current = async () => {
    try {
      const [schemaResponse, reservedNamesResponse] = await Promise.all([
        fetchClient.get(`/content-type-builder/schema`),
        fetchClient.get(`/content-type-builder/reserved-names`),
      ]);

      const { components, contentTypes } = schemaResponse.data.data;

      dispatch(
        actions.init({
          components: mapValues(components, (component) => ({
            ...component,
            status: 'UNCHANGED',
          })) as Components,
          contentTypes: mapValues(contentTypes, (contentType) => ({
            ...contentType,
            status: 'UNCHANGED',
          })) as ContentTypes,
          reservedNames: reservedNamesResponse.data,
        })
      );

      dispatch(actions.clearHistory());
    } catch (err) {
      console.error({ err });
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  React.useEffect(() => {
    getDataRef.current();

    return () => {
      // Reload the plugin so the cycle is new again
      dispatch(actions.reloadPlugin());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!autoReload) {
      toggleNotification({
        type: 'info',
        message: formatMessage({ id: getTrad('notification.info.autoreaload-disable') }),
      });
    }
  }, [autoReload, toggleNotification, formatMessage]);

  const getAllComponentsThatHaveAComponentInTheirAttributes = (components: Components) => {
    const composWithCompos = retrieveComponentsThatHaveComponents(components);

    return composWithCompos;
  };

  const getAllNestedComponents = (components: Components) => {
    const appNestedCompo = retrieveNestedComponents(components);

    return appNestedCompo;
  };

  const updatePermissions = async () => {
    await refetchPermissions();
  };

  const saveSchema = async () => {
    setIsSaving(true);

    const PluginForms = plugin?.apis?.forms as FormAPI;

    const mutatedCTs = Object.entries(state.current.contentTypes).reduce(
      (acc, [uid, contentType]) => {
        acc[uid] = PluginForms.mutateContentTypeSchema(
          contentType,
          initialContentTypes[uid]
        ) as ContentType;

        return acc;
      },
      {} as ContentTypes
    );

    const { requestData, trackingEventProperties } = stateToRequestData({
      components: state.current.components,
      contentTypes: mutatedCTs,
    });

    const isSendingContentTypes = Object.keys(state.current.contentTypes).length > 0;

    lockAppWithAutoreload();

    try {
      await fetchClient.post(`/content-type-builder/update-schema`, { data: requestData });

      if (isSendingContentTypes) {
        trackUsage('didCreateGuidedTourCollectionType');
      }

      // Make sure the server has restarted
      await serverRestartWatcher();
      // refetch and update initial state after the data has been saved
      await getDataRef.current();
      // Update the app's permissions
      await updatePermissions();
    } catch (err) {
      console.error({ err });
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });

      trackUsage('didUpdateCTBSchema', { ...trackingEventProperties, success: false });
    } finally {
      setIsSaving(false);
      unlockAppWithAutoreload();

      dispatch(adminApi.util.invalidateTags(['GuidedTourMeta', 'HomepageKeyStatistics']));
      dispatchGuidedTour({
        type: 'set_completed_actions',
        payload: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema],
      });

      trackUsage('didUpdateCTBSchema', { ...trackingEventProperties, success: true });
    }
  };

  const componentsThatHaveOtherComponentInTheirAttributes = React.useMemo(() => {
    return getAllComponentsThatHaveAComponentInTheirAttributes(components);
  }, [components]);

  const nestedComponents = React.useMemo(() => {
    return getAllNestedComponents(components);
  }, [components]);

  const allComponentsCategories = React.useMemo(() => {
    return retrieveSpecificInfoFromComponents(components, ['category']);
  }, [components]);

  const componentsGroupedByCategory = React.useMemo(() => {
    return groupBy(components, 'category');
  }, [components]);

  const sortedContentTypesList = React.useMemo(() => {
    return sortContentType(contentTypes);
  }, [contentTypes]);

  const context: DataManagerContextValue = {
    componentsThatHaveOtherComponentInTheirAttributes,
    nestedComponents,
    saveSchema,
    reservedNames,
    components,
    contentTypes,
    initialComponents,
    initialContentTypes,
    isSaving,
    isModified,
    isInDevelopmentMode,
    allComponentsCategories,
    componentsGroupedByCategory,
    sortedContentTypesList,
    isLoading,
    addAttribute(payload) {
      dispatch(actions.addAttribute(payload));
    },
    editAttribute(payload) {
      dispatch(actions.editAttribute(payload));
    },
    addCustomFieldAttribute(payload) {
      dispatch(actions.addCustomFieldAttribute(payload));
    },
    editCustomFieldAttribute(payload) {
      dispatch(actions.editCustomFieldAttribute(payload));
    },
    addCreatedComponentToDynamicZone(payload) {
      dispatch(actions.addCreatedComponentToDynamicZone(payload));
    },
    createSchema(payload) {
      dispatch(actions.createSchema(payload));
    },
    createComponentSchema({ data, uid, componentCategory }) {
      dispatch(actions.createComponentSchema({ data, uid, componentCategory }));
    },
    changeDynamicZoneComponents({ forTarget, targetUid, dynamicZoneTarget, newComponents }) {
      dispatch(
        actions.changeDynamicZoneComponents({
          forTarget,
          targetUid,
          dynamicZoneTarget,
          newComponents,
        })
      );
    },
    removeAttribute(payload) {
      if (payload.forTarget === 'contentType') {
        trackUsage('willDeleteFieldOfContentType');
      }

      dispatch(actions.removeField(payload));
    },
    removeComponentFromDynamicZone(payload) {
      dispatch(actions.removeComponentFromDynamicZone(payload));
    },
    deleteComponent(uid: Internal.UID.Component) {
      const userConfirm = window.confirm(
        formatMessage({
          id: getTrad(`popUpWarning.bodyMessage.component.delete`),
        })
      );

      if (userConfirm) {
        onCloseModal();

        dispatch(actions.deleteComponent(uid));
      }
    },
    deleteContentType(uid: Internal.UID.ContentType) {
      const userConfirm = window.confirm(
        formatMessage({
          id: getTrad(`popUpWarning.bodyMessage.contentType.delete`),
        })
      );

      if (userConfirm) {
        onCloseModal();

        dispatch(actions.deleteContentType(uid));
      }
    },

    updateComponentSchema({ data, componentUID }) {
      dispatch(
        actions.updateComponentSchema({
          data,
          uid: componentUID,
        })
      );
    },

    updateComponentUid({ componentUID, newComponentUID }) {
      dispatch(
        actions.updateComponentUid({
          uid: componentUID,
          newComponentUID,
        })
      );
    },

    updateSchema(args) {
      dispatch(actions.updateSchema(args));
    },

    moveAttribute(args) {
      dispatch(actions.moveAttribute(args));
    },

    applyChange(args) {
      dispatch(actions.applyChange(args));
    },

    history: {
      undo() {
        dispatch(actions.undo());
      },

      redo() {
        dispatch(actions.redo());
      },

      discardAllChanges() {
        dispatch(actions.discardAll());
      },

      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      canDiscardAll: isModified,
    },
  };

  return <DataManagerContext.Provider value={context}>{children}</DataManagerContext.Provider>;
};

// eslint-disable-next-line import/no-default-export
export default DataManagerProvider;
