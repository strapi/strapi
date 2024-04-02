import * as React from 'react';

import { Page, useNotification, useAPIErrorHandler } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { TEMP_FIELD_NAME } from '../components/ConfigurationForm/Fields';
import { ConfigurationForm, ConfigurationFormProps } from '../components/ConfigurationForm/Form';
import { ComponentsDictionary, extractContentTypeComponents } from '../hooks/useContentTypeSchema';
import {
  DEFAULT_SETTINGS,
  EditLayout,
  convertEditLayoutToFieldLayouts,
} from '../hooks/useDocumentLayout';
import { useTypedSelector } from '../modules/hooks';
import {
  useGetComponentConfigurationQuery,
  useUpdateComponentConfigurationMutation,
} from '../services/components';
import { useGetInitialDataQuery } from '../services/init';
import { setIn } from '../utils/objects';

import type { Component, FindComponentConfiguration } from '../../../shared/contracts/components';
import type { Metadatas } from '../../../shared/contracts/content-types';

/* -------------------------------------------------------------------------------------------------
 * ComponentConfigurationPage
 * -----------------------------------------------------------------------------------------------*/

const ComponentConfigurationPage = () => {
  /**
   * useDocumentLayout only works for documents, not components,
   * it feels weird to make that hook work for both when this is SUCH
   * a unique use case and we only do it here, so in short, we essentially
   * just extracted the logic to make an edit view layout and reproduced it here.
   */
  const { slug: model } = useParams<{ slug: string }>();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const {
    components,
    fieldSizes,
    schema,
    error: errorSchema,
    isLoading: isLoadingSchema,
    isFetching: isFetchingSchema,
  } = useGetInitialDataQuery(undefined, {
    selectFromResult: (res) => {
      const schema = res.data?.components.find((ct) => ct.uid === model);

      const componentsByKey = res.data?.components.reduce<ComponentsDictionary>(
        (acc, component) => {
          acc[component.uid] = component;

          return acc;
        },
        {}
      );

      const components = extractContentTypeComponents(schema?.attributes, componentsByKey);

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
        components,
        schema,
        fieldSizes,
      };
    },
  });

  React.useEffect(() => {
    if (errorSchema) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(errorSchema),
      });
    }
  }, [errorSchema, formatAPIError, toggleNotification]);

  const {
    data,
    isLoading: isLoadingConfig,
    isFetching: isFetchingConfig,
    error,
  } = useGetComponentConfigurationQuery(model ?? '');

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  /**
   * you **must** check if we're loading or fetching in case the component gets new props
   * but nothing was unmounted, it then becomes a fetch, not a load.
   */
  const isLoading = isLoadingConfig || isLoadingSchema || isFetchingConfig || isFetchingSchema;

  const editLayout = React.useMemo(
    () =>
      data && !isLoading
        ? formatEditLayout(data, { schema, components })
        : ({
            layout: [],
            components: {},
            metadatas: {},
            options: {},
            settings: DEFAULT_SETTINGS,
          } as EditLayout),
    [data, isLoading, schema, components]
  );

  const [updateConfiguration] = useUpdateComponentConfigurationMutation();
  const handleSubmit: ConfigurationFormProps['onSubmit'] = async (formData) => {
    try {
      /**
       * We reconstruct the metadatas object by taking the existing list metadatas
       * and re-merging that by attribute name with the current list metadatas, whilst overwriting
       * the data from the form we've built.
       */
      const meta = Object.entries(data?.component.metadatas ?? {}).reduce<Metadatas>(
        (acc, [name, { edit, list }]) => {
          const {
            __temp_key__,
            size: _size,
            name: _name,
            ...editedMetadata
          } = formData.layout.flatMap((row) => row.children).find((field) => field.name === name) ??
          {};

          acc[name] = {
            edit: {
              ...edit,
              ...editedMetadata,
            },
            list,
          };

          return acc;
        },
        {}
      );

      const res = await updateConfiguration({
        layouts: {
          edit: formData.layout.map((row) =>
            row.children.reduce<Array<{ name: string; size: number }>>((acc, { name, size }) => {
              if (name !== TEMP_FIELD_NAME) {
                return [...acc, { name, size }];
              }

              return acc;
            }, [])
          ),
          list: data?.component.layouts.list,
        },
        settings: setIn(formData.settings, 'displayName', undefined),
        metadatas: meta,
        uid: model,
      });

      if ('data' in res) {
        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
        });
      } else {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(res.error),
        });
      }
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  if (isLoading) {
    return <Page.Loading />;
  }

  if (error || errorSchema || !schema) {
    return <Page.Error />;
  }

  return (
    <>
      <Page.Title>{`Configure ${editLayout.settings.displayName} Edit View`}</Page.Title>
      <ConfigurationForm
        onSubmit={handleSubmit}
        attributes={schema.attributes}
        fieldSizes={fieldSizes}
        layout={editLayout}
      />
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/

const formatEditLayout = (
  data: FindComponentConfiguration.Response['data'],
  { schema, components }: { schema?: Component; components: ComponentsDictionary }
) => {
  const editAttributes = convertEditLayoutToFieldLayouts(
    data.component.layouts.edit,
    schema?.attributes,
    data.component.metadatas,
    { configurations: data.components, schemas: components }
  );

  const componentEditAttributes = Object.entries(data.components).reduce<EditLayout['components']>(
    (acc, [uid, configuration]) => {
      acc[uid] = {
        layout: convertEditLayoutToFieldLayouts(
          configuration.layouts.edit,
          components[uid].attributes,
          configuration.metadatas
        ),
        settings: {
          ...configuration.settings,
          icon: components[uid].info.icon,
          displayName: components[uid].info.displayName,
        },
      };
      return acc;
    },
    {}
  );

  const editMetadatas = Object.entries(data.component.metadatas).reduce<EditLayout['metadatas']>(
    (acc, [attribute, metadata]) => {
      return {
        ...acc,
        [attribute]: metadata.edit,
      };
    },
    {}
  );

  return {
    layout: [editAttributes],
    components: componentEditAttributes,
    metadatas: editMetadatas,
    options: {
      ...schema?.options,
      ...schema?.pluginOptions,
    },
    settings: {
      ...data.component.settings,
      displayName: schema?.info.displayName,
    },
  };
};

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/

const ProtectedComponentConfigurationPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.contentManager?.componentsConfigurations
  );

  return (
    <Page.Protect permissions={permissions}>
      <ComponentConfigurationPage />
    </Page.Protect>
  );
};

export { ComponentConfigurationPage, ProtectedComponentConfigurationPage };
