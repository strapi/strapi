import * as React from 'react';

import {
  AnErrorOccurred,
  CheckPagePermissions,
  LoadingIndicatorPage,
  useAPIErrorHandler,
  useNotification,
  useTracking,
} from '@strapi/helper-plugin';

import { useTypedSelector } from '../../core/store/hooks';
import { TEMP_FIELD_NAME } from '../components/ConfigurationForm/Fields';
import { ConfigurationForm, ConfigurationFormProps } from '../components/ConfigurationForm/Form';
import { useDoc } from '../hooks/useDocument';
import { useDocLayout } from '../hooks/useDocumentLayout';
import { useUpdateContentTypeConfigurationMutation } from '../services/contentTypes';
import { useGetInitialDataQuery } from '../services/init';
import { setIn } from '../utils/object';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

const EditConfigurationPage = () => {
  const { trackUsage } = useTracking();
  const toggleNotification = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { isLoading: isLoadingSchema, schema, model } = useDoc();
  const { isLoading: isLoadingLayout, error, list, edit } = useDocLayout();

  const {
    fieldSizes,
    error: errorFieldSizes,
    isLoading: isLoadingFieldSizes,
    isFetching: isFetchingFieldSizes,
  } = useGetInitialDataQuery(undefined, {
    selectFromResult: (res) => {
      const fieldSizes = Object.entries(res.data?.fieldSizes ?? {}).reduce<
        ConfigurationFormProps['fieldSizes']
      >((acc, [attributeName, { default: size }]) => {
        acc[attributeName] = size;

        return acc;
      }, {});

      return {
        isFetching: res.isFetching,
        isLoading: res.isLoading,
        error: res.error,
        fieldSizes,
      };
    },
  });

  React.useEffect(() => {
    if (errorFieldSizes) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(errorFieldSizes),
      });
    }
  }, [errorFieldSizes, formatAPIError, toggleNotification]);

  const isLoading =
    isLoadingSchema || isLoadingLayout || isLoadingFieldSizes || isFetchingFieldSizes;

  const [updateConfiguration] = useUpdateContentTypeConfigurationMutation();
  const handleSubmit: ConfigurationFormProps['onSubmit'] = async (data, event) => {
    event.preventDefault();

    try {
      trackUsage('willSaveContentTypeLayout');

      /**
       * We reconstruct the metadatas object by taking the existing list metadatas
       * and re-merging that by attribute name with the current list metadatas, whilst overwriting
       * the data from the form we've built.
       */
      const meta = Object.entries(list.metadatas).reduce<Contracts.ContentTypes.Metadatas>(
        (acc, [name, { mainField: _mainField, ...listMeta }]) => {
          const existingEditMeta = edit.metadatas[name];

          const {
            __temp_key__,
            size: _size,
            name: _name,
            ...editedMetadata
          } = data.layout.flatMap((row) => row.children).find((field) => field.name === name) ?? {};

          acc[name] = {
            edit: {
              ...existingEditMeta,
              ...editedMetadata,
            },
            list: listMeta,
          };

          return acc;
        },
        {}
      );

      const res = await updateConfiguration({
        layouts: {
          edit: data.layout.map((row) =>
            row.children.reduce<Array<{ name: string; size: number }>>((acc, { name, size }) => {
              if (name !== TEMP_FIELD_NAME) {
                return [...acc, { name, size }];
              }

              return acc;
            }, [])
          ),
          list: list.layout.map((field) => field.name),
        },
        settings: setIn(data.settings, 'displayName', undefined),
        metadatas: meta,
        uid: model,
      });

      if ('data' in res) {
        trackUsage('didEditEditSettings');
        toggleNotification({
          type: 'success',
          message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
        });
      } else {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(res.error),
        });
      }
    } catch {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occurred' },
      });
    }
  };

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (errorFieldSizes || error || !schema) {
    return <AnErrorOccurred />;
  }

  return (
    <ConfigurationForm
      onSubmit={handleSubmit}
      attributes={schema.attributes}
      fieldSizes={fieldSizes}
      layout={edit}
    />
  );
};

const ProtectedEditConfigurationPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.contentManager?.collectionTypesConfigurations
  );

  return (
    <CheckPagePermissions permissions={permissions}>
      <EditConfigurationPage />
    </CheckPagePermissions>
  );
};

export { ProtectedEditConfigurationPage, EditConfigurationPage };
