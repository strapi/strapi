import * as React from 'react';

import {
  Button,
  ContentLayout,
  Divider,
  Flex,
  HeaderLayout,
  Layout,
  Main,
} from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  useFetchClient,
  useNotification,
  useQueryParams,
  useTracking,
} from '@strapi/helper-plugin';
import { ArrowLeft, Check } from '@strapi/icons';
import isEqual from 'lodash/isEqual';
import upperFirst from 'lodash/upperFirst';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';
import { Navigate, useParams, NavLink } from 'react-router-dom';

import { useTypedSelector } from '../../../core/store/hooks';
import { queryKeyPrefix as initDataQueryKey } from '../../hooks/useContentManagerInitData';
import { useContentTypeLayout } from '../../hooks/useLayouts';
import { checkIfAttributeIsDisplayable } from '../../utils/attributes';
import { formatLayoutForSettingsView } from '../../utils/layouts';
import { getTranslation } from '../../utils/translations';

import { EditFieldForm } from './components/EditFieldForm';
import { Settings } from './components/Settings';
import { SortDisplayedFields } from './components/SortDisplayedFields';
import { EXCLUDED_SORT_ATTRIBUTE_TYPES } from './constants';
import { reducer, initialState } from './reducer';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { AxiosError, AxiosResponse } from 'axios';

const ListSettingsView = () => {
  const queryClient = useQueryClient();
  const { put } = useFetchClient();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [{ query }] = useQueryParams<{ plugins?: Record<string, unknown> }>();
  const { collectionType, slug } = useParams<{ collectionType: string; slug: string }>();
  const toggleNotification = useNotification();

  const { isLoading: isLoadingLayout, layout: fetchedLayout } = useContentTypeLayout(slug);

  const { rawContentTypeLayout: layout } = React.useMemo(() => {
    let rawContentTypeLayout = null;

    if (fetchedLayout?.contentType) {
      rawContentTypeLayout = formatLayoutForSettingsView(fetchedLayout.contentType);
    }

    return { rawContentTypeLayout };
  }, [fetchedLayout]);

  const [{ fieldToEdit, fieldForm, initialData, modifiedData }, dispatch] = React.useReducer(
    reducer,
    initialState,
    () => ({
      ...initialState,
      initialData: layout,
      modifiedData: layout,
    })
  );

  React.useEffect(() => {
    dispatch({
      type: 'SET_DATA',
      data: layout,
    });
  }, [layout]);

  const isModalFormOpen = Object.keys(fieldForm).length !== 0;

  const { attributes = {}, options } = layout ?? {};
  const { list: displayedFields = [] } = modifiedData?.layouts ?? {
    list: [],
  };

  const handleChange = ({
    target: { name, value },
  }: {
    target: { name: string; value: string | number | boolean };
  }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value:
        name === 'settings.pageSize' && typeof value === 'string' ? parseInt(value, 10) : value,
    });
  };

  const { isLoading: isSubmittingForm, mutate } = useMutation<
    AxiosResponse<Contracts.ContentTypes.UpdateContentTypeConfiguration.Response>,
    AxiosError<Required<Pick<Contracts.CollectionTypes.BulkPublish.Response, 'error'>>>,
    Contracts.ContentTypes.UpdateContentTypeConfiguration.Request['body']
  >((body) => put(`/content-manager/content-types/${slug}/configuration`, body), {
    onSuccess() {
      toggleNotification({
        type: 'success',
        message: { id: getTranslation('success.record.save') },
      });

      trackUsage('didEditListSettings');

      queryClient.invalidateQueries(initDataQueryKey);
      queryClient.invalidateQueries(['content-manager', 'content-types', slug, 'configuration']);
    },
    onError() {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    },
  });

  const handleAddField = (item: string) => {
    dispatch({
      type: 'ADD_FIELD',
      item,
    });
  };

  const handleRemoveField = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.stopPropagation();

    if (displayedFields.length === 1) {
      toggleNotification({
        type: 'info',
        message: { id: getTranslation('notification.info.minimumFields') },
      });
    } else {
      dispatch({
        type: 'REMOVE_FIELD',
        index,
      });
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!modifiedData) return;

    const { layouts, settings, metadatas } = modifiedData;

    mutate({
      layouts,
      settings,
      metadatas,
    });

    trackUsage('willSaveContentTypeLayout');
  };

  const handleClickEditField = (fieldToEdit: string) => {
    dispatch({
      type: 'SET_FIELD_TO_EDIT',
      fieldToEdit,
    });
  };

  const handleCloseModal = () => {
    dispatch({
      type: 'UNSET_FIELD_TO_EDIT',
    });
  };

  const handleSubmitFieldEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({
      type: 'SUBMIT_FIELD_FORM',
    });
    handleCloseModal();
  };

  const handleChangeEditLabel = ({
    target: { name, value },
  }: {
    target: { name: string; value: string | boolean };
  }) => {
    dispatch({
      type: 'ON_CHANGE_FIELD_METAS',
      name,
      value,
    });
  };

  const listRemainingFields = Object.entries(attributes)
    .filter(
      ([name, attribute]) =>
        checkIfAttributeIsDisplayable(attribute) && !displayedFields.includes(name)
    )
    .map(([name]) => name)
    .sort();

  const sortOptions = Object.entries(attributes)
    .filter(([, attribute]) => !EXCLUDED_SORT_ATTRIBUTE_TYPES.includes(attribute.type))
    .map(([name]) => ({
      value: name,
      label: layout?.metadatas[name].list.label ?? '',
    }));

  const move = (originalIndex: number, atIndex: number) => {
    dispatch({
      type: 'MOVE_FIELD',
      originalIndex,
      atIndex,
    });
  };

  if (collectionType === 'single-types') {
    return <Navigate to={`/single-types/${slug}`} />;
  }

  if (isLoadingLayout) {
    return <LoadingIndicatorPage />;
  }

  const {
    settings: { pageSize, defaultSortBy, defaultSortOrder },
    kind,
    uid,
  } = initialData ?? { settings: {} };

  return (
    <Layout>
      <Main aria-busy={isSubmittingForm}>
        <form onSubmit={handleSubmit}>
          <HeaderLayout
            navigationAction={
              <Link
                startIcon={<ArrowLeft />}
                // @ts-expect-error invalid typings
                to={{
                  pathname: `/content-manager/${kind}/${uid}`,
                  search: stringify(
                    {
                      page: 1,
                      pageSize,
                      sort: `${defaultSortBy}:${defaultSortOrder}`,
                      plugins: query.plugins,
                    },
                    {
                      encode: false,
                    }
                  ),
                }}
                id="go-back"
                as={NavLink}
              >
                {formatMessage({ id: 'global.back', defaultMessage: 'Back' })}
              </Link>
            }
            primaryAction={
              <Button
                size="S"
                startIcon={<Check />}
                disabled={isEqual(modifiedData, initialData)}
                type="submit"
                loading={isSubmittingForm}
              >
                {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
              </Button>
            }
            subtitle={formatMessage({
              id: getTranslation(
                'components.SettingsViewWrapper.pluginHeader.description.list-settings'
              ),
              defaultMessage: 'Define the settings of the list view.',
            })}
            title={formatMessage(
              {
                id: getTranslation('components.SettingsViewWrapper.pluginHeader.title'),
                defaultMessage: 'Configure the view - {name}',
              },
              { name: upperFirst(modifiedData?.info.displayName) }
            )}
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
              <Settings
                contentTypeOptions={options}
                modifiedData={modifiedData}
                onChange={handleChange}
                sortOptions={sortOptions}
              />

              <Divider />

              <SortDisplayedFields
                listRemainingFields={listRemainingFields}
                displayedFields={displayedFields}
                onAddField={handleAddField}
                onClickEditField={handleClickEditField}
                onMoveField={move}
                onRemoveField={handleRemoveField}
                metadatas={modifiedData?.metadatas ?? {}}
              />
            </Flex>
          </ContentLayout>
        </form>

        {isModalFormOpen && (
          <EditFieldForm
            attributes={attributes}
            fieldForm={fieldForm}
            fieldToEdit={fieldToEdit}
            onChangeEditLabel={handleChangeEditLabel}
            onCloseModal={handleCloseModal}
            onSubmit={handleSubmitFieldEdit}
            type={attributes?.[fieldToEdit]?.type ?? 'text'}
          />
        )}
      </Main>
    </Layout>
  );
};

const ProtectedListSettingsView = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.contentManager?.collectionTypesConfigurations
  );

  return (
    <CheckPagePermissions permissions={permissions}>
      <ListSettingsView />
    </CheckPagePermissions>
  );
};

export { ProtectedListSettingsView, ListSettingsView };
