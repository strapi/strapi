import React, { memo, useContext, useReducer, useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation } from 'react-query';
import isEqual from 'lodash/isEqual';
import upperFirst from 'lodash/upperFirst';
import pick from 'lodash/pick';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import { stringify } from 'qs';
import {
  useNotification,
  useTracking,
  ConfirmDialog,
  Link,
  useFetchClient,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import {
  Box,
  Divider,
  Layout,
  HeaderLayout,
  ContentLayout,
  Main,
  Button,
} from '@strapi/design-system';
import { Check, ArrowLeft } from '@strapi/icons';

import { checkIfAttributeIsDisplayable, getTrad } from '../../utils';
import ModelsContext from '../../contexts/ModelsContext';
import { usePluginsQueryParams } from '../../hooks';
import Settings from './components/Settings';
import SortDisplayedFields from './components/SortDisplayedFields';
import EditFieldForm from './components/EditFieldForm';
import init from './init';
import reducer, { initialState } from './reducer';
import { EXCLUDED_SORT_ATTRIBUTE_TYPES } from './constants';

const ListSettingsView = ({ layout, slug }) => {
  const { put } = useFetchClient();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const pluginsQueryParams = usePluginsQueryParams();
  const toggleNotification = useNotification();
  const { refetchData } = useContext(ModelsContext);

  const [showWarningSubmit, setWarningSubmit] = useState(false);
  const toggleWarningSubmit = () => setWarningSubmit((prevState) => !prevState);
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, layout)
  );
  const { fieldToEdit, fieldForm, initialData, modifiedData } = reducerState;
  const isModalFormOpen = !isEmpty(fieldForm);

  const { attributes } = layout;
  const displayedFields = modifiedData.layouts.list;

  const goBackUrl = () => {
    const {
      settings: { pageSize, defaultSortBy, defaultSortOrder },
      kind,
      uid,
    } = initialData;
    const sort = `${defaultSortBy}:${defaultSortOrder}`;
    const goBackSearch = `${stringify(
      {
        page: 1,
        pageSize,
        sort,
      },
      { encode: false }
    )}${pluginsQueryParams ? `&${pluginsQueryParams}` : ''}`;

    return `/content-manager/${kind}/${uid}?${goBackSearch}`;
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value: name === 'settings.pageSize' ? parseInt(value, 10) : value,
    });
  };

  const handleConfirm = async () => {
    const body = pick(modifiedData, ['layouts', 'settings', 'metadatas']);
    submitMutation.mutate(body);
  };

  const handleAddField = (item) => {
    dispatch({
      type: 'ADD_FIELD',
      item,
    });
  };

  const handleRemoveField = (e, index) => {
    e.stopPropagation();

    if (displayedFields.length === 1) {
      toggleNotification({
        type: 'info',
        message: { id: getTrad('notification.info.minimumFields') },
      });
    } else {
      dispatch({
        type: 'REMOVE_FIELD',
        index,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    toggleWarningSubmit();
    trackUsage('willSaveContentTypeLayout');
  };

  const handleClickEditField = (fieldToEdit) => {
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

  const handleSubmitFieldEdit = (e) => {
    e.preventDefault();
    dispatch({
      type: 'SUBMIT_FIELD_FORM',
    });
    handleCloseModal();
  };

  const submitMutation = useMutation(
    (body) => put(`/content-manager/content-types/${slug}/configuration`, body),
    {
      onSuccess() {
        trackUsage('didEditListSettings');
        refetchData();
      },
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      },
    }
  );
  const { isLoading: isSubmittingForm } = submitMutation;

  const handleChangeEditLabel = ({ target: { name, value } }) => {
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
    .map(([name]) => name);

  const move = (originalIndex, atIndex) => {
    dispatch({
      type: 'MOVE_FIELD',
      originalIndex,
      atIndex,
    });
  };

  return (
    <Layout>
      <Main aria-busy={isSubmittingForm}>
        <form onSubmit={handleSubmit}>
          <HeaderLayout
            navigationAction={
              <Link startIcon={<ArrowLeft />} to={goBackUrl} id="go-back">
                {formatMessage({ id: 'global.back', defaultMessage: 'Back' })}
              </Link>
            }
            primaryAction={
              <Button
                size="S"
                startIcon={<Check />}
                disabled={isEqual(modifiedData, initialData)}
                type="submit"
              >
                {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
              </Button>
            }
            subtitle={formatMessage({
              id: getTrad('components.SettingsViewWrapper.pluginHeader.description.list-settings'),
              defaultMessage: 'Define the settings of the list view.',
            })}
            title={formatMessage(
              {
                id: getTrad('components.SettingsViewWrapper.pluginHeader.title'),
                defaultMessage: 'Configure the view - {name}',
              },
              { name: upperFirst(modifiedData.info.displayName) }
            )}
          />
          <ContentLayout>
            <Box
              background="neutral0"
              hasRadius
              shadow="tableShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingLeft={7}
              paddingRight={7}
            >
              <Settings
                modifiedData={modifiedData}
                onChange={handleChange}
                sortOptions={sortOptions}
              />
              <Box paddingTop={6} paddingBottom={6}>
                <Divider />
              </Box>
              <SortDisplayedFields
                listRemainingFields={listRemainingFields}
                displayedFields={displayedFields}
                onAddField={handleAddField}
                onClickEditField={handleClickEditField}
                onMoveField={move}
                onRemoveField={handleRemoveField}
                metadatas={modifiedData.metadatas}
              />
            </Box>
          </ContentLayout>
          <ConfirmDialog
            bodyText={{
              id: getTrad('popUpWarning.warning.updateAllSettings'),
              defaultMessage: 'This will modify all your settings',
            }}
            iconRightButton={<Check />}
            isConfirmButtonLoading={isSubmittingForm}
            isOpen={showWarningSubmit}
            onToggleDialog={toggleWarningSubmit}
            onConfirm={handleConfirm}
            variantRightButton="success-light"
          />
        </form>
        {isModalFormOpen && (
          <EditFieldForm
            attributes={attributes}
            fieldForm={fieldForm}
            fieldToEdit={fieldToEdit}
            onChangeEditLabel={handleChangeEditLabel}
            onCloseModal={handleCloseModal}
            onSubmit={handleSubmitFieldEdit}
            type={get(attributes, [fieldToEdit, 'type'], 'text')}
          />
        )}
      </Main>
    </Layout>
  );
};

ListSettingsView.propTypes = {
  layout: PropTypes.shape({
    uid: PropTypes.string.isRequired,
    settings: PropTypes.shape({
      bulkable: PropTypes.bool,
      defaultSortBy: PropTypes.string,
      defaultSortOrder: PropTypes.string,
      filterable: PropTypes.bool,
      pageSize: PropTypes.number,
      searchable: PropTypes.bool,
    }).isRequired,
    metadatas: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,
    attributes: PropTypes.objectOf(
      PropTypes.shape({
        type: PropTypes.string,
      })
    ).isRequired,
  }).isRequired,
  slug: PropTypes.string.isRequired,
};

export default memo(ListSettingsView);
