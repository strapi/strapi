import * as React from 'react';

import {
  Form,
  type FormProps,
  useNotification,
  useTracking,
  useAPIErrorHandler,
  Page,
  Layouts,
} from '@strapi/admin/strapi-admin';
import { Divider, Flex, Main } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Navigate } from 'react-router-dom';

import { SINGLE_TYPES } from '../../constants/collections';
import { useDoc } from '../../hooks/useDocument';
import { ListFieldLayout, ListLayout, useDocLayout } from '../../hooks/useDocumentLayout';
import { useTypedSelector } from '../../modules/hooks';
import { useUpdateContentTypeConfigurationMutation } from '../../services/contentTypes';
import { setIn } from '../../utils/objects';

import { Header } from './components/Header';
import { Settings } from './components/Settings';
import { SortDisplayedFields } from './components/SortDisplayedFields';

import type { Metadatas } from '../../../../shared/contracts/content-types';

interface FormData extends Pick<ListLayout, 'settings'> {
  layout: Array<Pick<ListFieldLayout, 'sortable' | 'name'> & { label: string }>;
}

const ListConfiguration = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const { model, collectionType } = useDoc();

  const { isLoading: isLoadingLayout, list, edit } = useDocLayout();

  const [updateContentTypeConfiguration] = useUpdateContentTypeConfigurationMutation();
  const handleSubmit: FormProps<FormData>['onSubmit'] = async (data) => {
    try {
      trackUsage('willSaveContentTypeLayout');
      const layoutData = data.layout ?? [];
      /**
       * We reconstruct the metadatas object by taking the existing edit metadatas
       * and re-merging that by attribute name with the current list metadatas, whilst overwriting
       * the data from the form we've built.
       */
      const meta = Object.entries(edit.metadatas).reduce<Metadatas>((acc, [name, editMeta]) => {
        const { mainField: _mainField, ...listMeta } = list.metadatas[name];

        const { label, sortable } = layoutData.find((field) => field.name === name) ?? {};

        acc[name] = {
          edit: editMeta,
          list: {
            ...listMeta,
            label: label || listMeta.label,
            sortable: sortable || listMeta.sortable,
          },
        };

        return acc;
      }, {});

      const res = await updateContentTypeConfiguration({
        layouts: {
          edit: edit.layout.flatMap((panel) =>
            panel.map((row) => row.map(({ name, size }) => ({ name, size })))
          ),
          list: layoutData.map((field) => field.name),
        },
        settings: setIn(data.settings, 'displayName', undefined),
        metadatas: meta,
        uid: model,
      });

      if ('data' in res) {
        trackUsage('didEditListSettings');
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
    } catch (err) {
      console.error(err);
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

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

  if (collectionType === SINGLE_TYPES) {
    return <Navigate to={`/single-types/${model}`} />;
  }

  if (isLoadingLayout) {
    return <Page.Loading />;
  }

  return (
    <Layouts.Root>
      <Page.Title>{`Configure ${list.settings.displayName} List View`}</Page.Title>
      <Main>
        <Form initialValues={initialValues} onSubmit={handleSubmit} method="PUT">
          <Header
            collectionType={collectionType}
            model={model}
            name={list.settings.displayName ?? ''}
          />
          <Layouts.Content>
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
              <Settings />
              <Divider />
              <SortDisplayedFields />
            </Flex>
          </Layouts.Content>
        </Form>
      </Main>
    </Layouts.Root>
  );
};

const ProtectedListConfiguration = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.contentManager?.collectionTypesConfigurations
  );

  return (
    <Page.Protect permissions={permissions}>
      <ListConfiguration />
    </Page.Protect>
  );
};

export { ProtectedListConfiguration, ListConfiguration };
export type { FormData };
