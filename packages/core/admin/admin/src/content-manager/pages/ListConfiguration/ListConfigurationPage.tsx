import * as React from 'react';

import { ContentLayout, Divider, Flex, Layout, Main } from '@strapi/design-system';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  useAPIErrorHandler,
  useNotification,
  useTracking,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { Navigate } from 'react-router-dom';

import { useTypedSelector } from '../../../core/store/hooks';
import { useEnterprise } from '../../../hooks/useEnterprise';
import { Form, FormProps } from '../../components/Form';
import { useDoc } from '../../hooks/useDocument';
import { ListFieldLayout, ListLayout, useDocLayout } from '../../hooks/useDocumentLayout';
import { useUpdateContentTypeConfigurationMutation } from '../../services/contentTypes';
import { setIn } from '../../utils/object';

import { Header } from './components/Header';
import { Settings, SettingsProps } from './components/Settings';
import { SortDisplayedFields } from './components/SortDisplayedFields';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

const EXCLUDED_SORT_ATTRIBUTE_TYPES = [
  'media',
  'richtext',
  'dynamiczone',
  'relation',
  'component',
  'json',
  'blocks',
];

interface FormData extends Pick<ListLayout, 'settings'> {
  layout: Array<Pick<ListFieldLayout, 'sortable' | 'name'> & { label: string }>;
}

const ListConfiguration = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const toggleNotification = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { model, collectionType, schema } = useDoc();

  const { isLoading: isLoadingLayout, list, edit } = useDocLayout();

  const [updateContentTypeConfiguration] = useUpdateContentTypeConfigurationMutation();
  const handleSubmit: FormProps<FormData>['onSubmit'] = async (data, event) => {
    event.preventDefault();

    try {
      trackUsage('willSaveContentTypeLayout');

      /**
       * We reconstruct the metadatas object by taking the existing edit metadatas
       * and re-merging that by attribute name with the current list metadatas, whilst overwriting
       * the data from the form we've built.
       */
      const meta = Object.entries(edit.metadatas).reduce<Contracts.ContentTypes.Metadatas>(
        (acc, [name, editMeta]) => {
          const { mainField: _mainField, ...listMeta } = list.metadatas[name];

          const { label, sortable } = data.layout.find((field) => field.name === name) ?? {};

          acc[name] = {
            edit: editMeta,
            list: {
              ...listMeta,
              label,
              sortable,
            },
          };

          return acc;
        },
        {}
      );

      const res = await updateContentTypeConfiguration({
        layouts: {
          edit: edit.layout.flatMap((panel) =>
            panel.map((row) => row.map(({ name, size }) => ({ name, size })))
          ),
          list: data.layout.map((field) => field.name),
        },
        settings: setIn(data.settings, 'displayName', undefined),
        metadatas: meta,
        uid: model,
      });

      if ('data' in res) {
        trackUsage('didEditListSettings');
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

  const sortOptionsCE = React.useMemo(
    () =>
      Object.values(list.layout)
        .filter((field) => !EXCLUDED_SORT_ATTRIBUTE_TYPES.includes(field.attribute.type))
        .map<SettingsProps['options'][number]>(({ name, label }) => ({
          value: name,
          label: typeof label !== 'string' ? formatMessage(label) : label,
        })),
    [formatMessage, list.layout]
  );

  const eeSortOpt = useEnterprise(
    [] as SettingsProps['options'],
    async () => {
      return (
        await import('../../../../../ee/admin/src/content-manager/pages/ListSettingsView/constants')
      ).REVIEW_WORKFLOW_STAGE_SORT_OPTION_NAME;
    },
    {
      combine(ceOptions, eeOption) {
        return [...ceOptions, { ...eeOption, label: formatMessage(eeOption.label) }];
      },
      defaultValue: [],
      enabled: !!schema?.options?.reviewWorkflows,
    }
  ) as SettingsProps['options'];

  const initialValues = React.useMemo(() => {
    return {
      layout: list.layout.map(({ label, sortable, name }) => ({
        label: typeof label === 'string' ? label : formatMessage(label),
        sortable,
        name,
      })),
      settings: list.settings,
    } satisfies FormData;
  }, [formatMessage, list.layout, list.settings]);

  if (collectionType === 'single-types') {
    return <Navigate to={`/single-types/${model}`} />;
  }

  if (isLoadingLayout) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Layout>
      <Main>
        <Form initialValues={initialValues} onSubmit={handleSubmit} method="PUT">
          <Header
            collectionType={collectionType}
            model={model}
            name={list.settings.displayName ?? ''}
          />
          <ContentLayout>
            <Flex
              alignItems="stretch"
              background="neutral0"
              direction="column"
              gap={6}
              hasRadius
              shadow="tableShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingLeft={7}
              paddingRight={7}
            >
              <Settings options={[...sortOptionsCE, ...eeSortOpt]} />
              <Divider />
              <SortDisplayedFields layout={list.layout} />
            </Flex>
          </ContentLayout>
        </Form>
      </Main>
    </Layout>
  );
};

const ProtectedListConfiguration = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.contentManager?.collectionTypesConfigurations
  );

  return (
    <CheckPagePermissions permissions={permissions}>
      <ListConfiguration />
    </CheckPagePermissions>
  );
};

export { ProtectedListConfiguration, ListConfiguration };
export type { FormData };
