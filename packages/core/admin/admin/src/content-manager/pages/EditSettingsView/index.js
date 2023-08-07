import React, { useReducer, useState } from 'react';

import {
  Box,
  Button,
  ContentLayout,
  Divider,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Main,
  Option,
  Select,
  Typography,
} from '@strapi/design-system';
import {
  ConfirmDialog,
  Link,
  useFetchClient,
  useNotification,
  useTracking,
} from '@strapi/helper-plugin';
import { ArrowLeft, Check } from '@strapi/icons';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import upperFirst from 'lodash/upperFirst';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { getTrad } from '../../utils';
import { selectFieldSizes } from '../App/selectors';

import DisplayedFields from './components/DisplayedFields';
import ModalForm from './components/FormModal';
import { LayoutDndProvider } from './components/LayoutDndProvider';
import init from './init';
import reducer, { initialState } from './reducer';
import { unformatLayout } from './utils/layout';

const EditSettingsView = ({ mainLayout, components, isContentTypeView, slug, updateLayout }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, mainLayout, components)
  );
  const [isDraggingSibling, setIsDraggingSibling] = useState(false);
  const { trackUsage } = useTracking();
  const toggleNotification = useNotification();
  const { goBack } = useHistory();
  const [isModalFormOpen, setIsModalFormOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const { componentLayouts, initialData, modifiedData, metaToEdit, metaForm } = reducerState;
  const { formatMessage } = useIntl();
  const modelName = mainLayout.info.displayName;
  const attributes = modifiedData?.attributes ?? {};
  const fieldSizes = useSelector(selectFieldSizes);
  const { put } = useFetchClient();

  const entryTitleOptions = Object.keys(attributes).filter((attr) => {
    const type = attributes?.[attr]?.type ?? '';

    return (
      ![
        'dynamiczone',
        'json',
        'text',
        'relation',
        'component',
        'boolean',
        'media',
        'password',
        'richtext',
        'timestamp',
      ].includes(type) && !!type
    );
  });
  const editLayout = modifiedData.layouts.edit;
  const displayedFields = editLayout.flatMap((layout) => layout.rowContent);
  const editLayoutFields = Object.keys(modifiedData.attributes)
    .filter((attr) => (modifiedData?.metadatas?.[attr]?.edit?.visible ?? false) === true)
    .filter((attr) => displayedFields.findIndex((el) => el.name === attr) === -1)
    .sort();

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value,
    });
  };

  const handleToggleModal = () => {
    setIsModalFormOpen((prev) => !prev);
  };

  const toggleConfirmDialog = () => {
    setIsConfirmDialogOpen((prev) => !prev);
  };

  const handleMetaChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE_META',
      keys: name.split('.'),
      value,
    });
  };

  const handleSizeChange = ({ name, value }) => {
    dispatch({
      type: 'ON_CHANGE_SIZE',
      name,
      value,
    });
  };

  const handleMetaSubmit = (e) => {
    e.preventDefault();
    dispatch({
      type: 'SUBMIT_META_FORM',
    });
    handleToggleModal();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    toggleConfirmDialog();
  };

  const submitMutation = useMutation(
    (body) => {
      return put(
        isContentTypeView
          ? `/content-manager/content-types/${slug}/configuration`
          : `/content-manager/components/${slug}/configuration`,
        body
      );
    },
    {
      onSuccess({ data }) {
        if (updateLayout) {
          updateLayout(data.data);
        }
        dispatch({
          type: 'SUBMIT_SUCCEEDED',
        });
        toggleConfirmDialog();
        trackUsage('didEditEditSettings');
      },
      onError() {
        toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
      },
    }
  );
  const { isLoading: isSubmittingForm } = submitMutation;

  const handleConfirm = () => {
    const { layouts, metadatas, settings } = cloneDeep(modifiedData);
    submitMutation.mutate({
      layouts: {
        ...layouts,
        edit: unformatLayout(layouts.edit),
      },
      metadatas,
      settings,
    });
  };

  const handleMoveRelation = (fromIndex, toIndex) => {
    dispatch({
      type: 'MOVE_RELATION',
      fromIndex,
      toIndex,
    });
  };

  const handleMoveField = (fromIndex, toIndex) => {
    dispatch({
      type: 'MOVE_FIELD',
      fromIndex,
      toIndex,
    });
  };

  const moveItem = (dragIndex, hoverIndex, dragRowIndex, hoverRowIndex) => {
    // Same row = just reorder
    if (dragRowIndex === hoverRowIndex) {
      dispatch({
        type: 'REORDER_ROW',
        dragRowIndex,
        dragIndex,
        hoverIndex,
      });
    } else {
      dispatch({
        type: 'REORDER_DIFF_ROW',
        dragIndex,
        hoverIndex,
        dragRowIndex,
        hoverRowIndex,
      });
    }
  };

  const moveRow = (fromIndex, toIndex) => {
    dispatch({
      type: 'MOVE_ROW',
      fromIndex,
      toIndex,
    });
  };

  return (
    <LayoutDndProvider
      isContentTypeView={isContentTypeView}
      attributes={attributes}
      modifiedData={modifiedData}
      slug={slug}
      componentLayouts={componentLayouts}
      selectedField={metaToEdit}
      fieldForm={metaForm}
      onMoveRelation={handleMoveRelation}
      onMoveField={handleMoveField}
      moveRow={moveRow}
      moveItem={moveItem}
      setEditFieldToSelect={(name) => {
        dispatch({
          type: 'SET_FIELD_TO_EDIT',
          name,
        });
        handleToggleModal();
      }}
      isDraggingSibling={isDraggingSibling}
      setIsDraggingSibling={setIsDraggingSibling}
    >
      <Main>
        <form onSubmit={handleSubmit}>
          <HeaderLayout
            title={formatMessage(
              {
                id: getTrad('components.SettingsViewWrapper.pluginHeader.title'),
                defaultMessage: `Configure the view - ${upperFirst(modelName)}`,
              },
              { name: upperFirst(modelName) }
            )}
            subtitle={formatMessage({
              id: getTrad('components.SettingsViewWrapper.pluginHeader.description.edit-settings'),
              defaultMessage: 'Customize how the edit view will look like.',
            })}
            navigationAction={
              <Link
                startIcon={<ArrowLeft />}
                onClick={(e) => {
                  e.preventDefault();
                  goBack();
                }}
                to="/"
              >
                {formatMessage({
                  id: 'global.back',
                  defaultMessage: 'Back',
                })}
              </Link>
            }
            primaryAction={
              <Button
                disabled={isEqual(initialData, modifiedData)}
                startIcon={<Check />}
                type="submit"
              >
                {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
              </Button>
            }
          />
          <ContentLayout>
            <Box
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingLeft={7}
              paddingRight={7}
            >
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Typography variant="delta" as="h2">
                  {formatMessage({
                    id: getTrad('containers.SettingPage.settings'),
                    defaultMessage: 'Settings',
                  })}
                </Typography>
                <Grid>
                  <GridItem col={6} s={12}>
                    <Select
                      label={formatMessage({
                        id: getTrad('containers.SettingPage.editSettings.entry.title'),
                        defaultMessage: 'Entry title',
                      })}
                      hint={formatMessage({
                        id: getTrad('containers.SettingPage.editSettings.entry.title.description'),
                        defaultMessage: 'Set the display field of your entry',
                      })}
                      onChange={(value) => {
                        handleChange({
                          target: {
                            name: 'settings.mainField',
                            value: value === '' ? null : value,
                          },
                        });
                      }}
                      value={modifiedData.settings.mainField}
                    >
                      {entryTitleOptions.map((attribute) => (
                        <Option key={attribute} value={attribute}>
                          {attribute}
                        </Option>
                      ))}
                    </Select>
                  </GridItem>
                </Grid>
                <Box paddingTop={2} paddingBottom={2}>
                  <Divider />
                </Box>
                <Typography variant="delta" as="h3">
                  {formatMessage({
                    id: getTrad('containers.SettingPage.view'),
                    defaultMessage: 'View',
                  })}
                </Typography>

                <DisplayedFields
                  attributes={attributes}
                  editLayout={editLayout}
                  fields={editLayoutFields}
                  onAddField={(field) => {
                    dispatch({
                      type: 'ON_ADD_FIELD',
                      name: field,
                      fieldSizes,
                    });
                  }}
                  onRemoveField={(rowId, index) => {
                    dispatch({
                      type: 'REMOVE_FIELD',
                      rowIndex: rowId,
                      fieldIndex: index,
                    });
                  }}
                />
              </Flex>
            </Box>
          </ContentLayout>
          <ConfirmDialog
            bodyText={{
              id: getTrad('popUpWarning.warning.updateAllSettings'),
              defaultMessage: 'This will modify all your settings',
            }}
            iconRightButton={<Check />}
            isConfirmButtonLoading={isSubmittingForm}
            isOpen={isConfirmDialogOpen}
            onToggleDialog={toggleConfirmDialog}
            onConfirm={handleConfirm}
            variantRightButton="success-light"
          />
        </form>
        {isModalFormOpen && (
          <ModalForm
            onSubmit={handleMetaSubmit}
            onToggle={handleToggleModal}
            onMetaChange={handleMetaChange}
            onSizeChange={handleSizeChange}
            type={attributes?.[metaToEdit]?.type ?? ''}
            customFieldUid={attributes?.[metaToEdit]?.customField ?? ''}
          />
        )}
      </Main>
    </LayoutDndProvider>
  );
};

EditSettingsView.defaultProps = {
  isContentTypeView: false,
  updateLayout: null,
};

EditSettingsView.propTypes = {
  components: PropTypes.object.isRequired,
  isContentTypeView: PropTypes.bool,
  mainLayout: PropTypes.shape({
    attributes: PropTypes.object.isRequired,
    info: PropTypes.object.isRequired,
    layouts: PropTypes.shape({
      list: PropTypes.array.isRequired,
      edit: PropTypes.array.isRequired,
    }).isRequired,
    metadatas: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,
  }).isRequired,
  slug: PropTypes.string.isRequired,
  updateLayout: PropTypes.func,
};

export default EditSettingsView;
