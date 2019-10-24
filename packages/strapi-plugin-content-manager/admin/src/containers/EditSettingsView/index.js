import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import { cloneDeep, get, set } from 'lodash';
import {
  // utils
  getQueryParameters,
  request,
  // contexts
  // TODO add emit event
  // useGlobalContext,
} from 'strapi-helper-plugin';
import { Inputs as Input } from '@buffetjs/custom';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import { LayoutDndProvider } from '../../contexts/LayoutDnd';
import getRequestUrl from '../../utils/getRequestUrl';
import FieldsReorder from '../../components/FieldsReorder';
import FormTitle from '../../components/FormTitle';
import LayoutTitle from '../../components/LayoutTitle';
import PopupForm from '../../components/PopupForm';
import SettingsViewWrapper from '../../components/SettingsViewWrapper';
import SortableList from '../../components/SortableList';
import { unformatLayout } from '../../utils/layout';
import getInputProps from './utils/getInputProps';
// TODO to remove when the API is available
import {
  retrieveDisplayedGroups,
  retrieveGroupLayoutsToFetch,
} from '../EditView/utils/groups';

import reducer, { initialState } from './reducer';

const EditSettingsView = ({
  deleteLayout,
  groupsAndModelsMainPossibleMainFields,
  history: { push },
  location: { search },
  slug,
}) => {
  const { groupSlug, type } = useParams();
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const [isModalFormOpen, setIsModalFormOpen] = useState(false);

  const fieldsReorderClassName = type === 'content-types' ? 'col-8' : 'col-12';
  const source = getQueryParameters(search, 'source');
  const abortController = new AbortController();
  const { signal } = abortController;
  const params = source === 'content-manager' && type ? {} : { source };

  const {
    groupLayouts,
    isLoading,
    initialData,
    metaToEdit,
    modifiedData,
    metaForm,
  } = reducerState.toJS();

  const getAttributes = useMemo(() => {
    return get(modifiedData, ['schema', 'attributes'], {});
  }, [modifiedData]);

  const getEditLayout = useCallback(() => {
    return get(modifiedData, ['layouts', 'edit'], []);
  }, [modifiedData]);

  const getForm = () =>
    Object.keys(
      get(modifiedData, ['metadatas', metaToEdit, 'edit'], {})
    ).filter(meta => meta !== 'visible');

  const getRelationsLayout = useCallback(() => {
    return get(modifiedData, ['layouts', 'editRelations'], []);
  }, [modifiedData]);

  const getEditRelationsRemaingFields = () => {
    const attributes = getAttributes;
    const displayedFields = getRelationsLayout();

    return Object.keys(attributes)
      .filter(attr => get(attributes, [attr, 'type'], '') === 'relation')
      .filter(attr => displayedFields.indexOf(attr) === -1);
  };

  const getEditRemainingFields = () => {
    const attributes = getAttributes;
    const metadatas = get(modifiedData, ['metadatas'], {});
    const displayedFields = getEditLayout().reduce(
      (acc, curr) => [...acc, ...curr.rowContent],
      []
    );

    return Object.keys(attributes)
      .filter(attr => get(attributes, [attr, 'type'], '') !== 'relation')
      .filter(attr => get(metadatas, [attr, 'edit', 'visible'], false) === true)
      .filter(attr => {
        return displayedFields.findIndex(el => el.name === attr) === -1;
      });
  };

  const getSelectedItemSelectOptions = useCallback(
    formType => {
      if (formType !== 'relation' && formType !== 'group') {
        return [];
      }

      const targetKey = formType === 'group' ? 'group' : 'targetModel';
      const key = get(
        modifiedData,
        ['schema', 'attributes', metaToEdit, targetKey],
        ''
      );

      return get(groupsAndModelsMainPossibleMainFields, [key], []);
    },

    [metaToEdit, groupsAndModelsMainPossibleMainFields, modifiedData]
  );

  useEffect(() => {
    const getData = async () => {
      try {
        const { data } = await request(
          getRequestUrl(`${type}/${slug || groupSlug}`),
          {
            method: 'GET',
            params,
            signal,
          }
        );

        // TODO temporary to remove when api available
        const groups = retrieveDisplayedGroups(
          get(data, 'schema.attributes', {})
        );
        const groupLayoutsToGet = retrieveGroupLayoutsToFetch(groups);

        const groupData = await Promise.all(
          groupLayoutsToGet.map(uid =>
            request(`/${pluginId}/groups/${uid}`, {
              method: 'GET',
              signal,
            })
          )
        );

        const groupLayouts = groupData.reduce((acc, current) => {
          acc[current.data.uid] = current.data;

          return acc;
        }, {});

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
          // TODO temporary to remove when api available
          groupLayouts,
        });
      } catch (err) {
        if (err.code !== 20) {
          strapi.notification.error('notification.error');
        }
      }
    };

    getData();

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, source, type]);

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value,
    });
  };

  const handleChangeMeta = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE_META',
      keys: name.split('.'),
      value,
    });
  };

  const handleConfirm = async () => {
    try {
      const body = cloneDeep(modifiedData);
      // We need to send the unformated edit layout
      set(body, 'layouts.edit', unformatLayout(body.layouts.edit));

      delete body.schema;
      delete body.uid;
      delete body.source;
      delete body.isGroup;

      await request(getRequestUrl(`${type}/${slug || groupSlug}`), {
        method: 'PUT',
        body,
        params: type === 'groups' ? {} : params,
        signal,
      });

      dispatch({
        type: 'SUBMIT_SUCCEEDED',
      });
      deleteLayout(slug);
      // emitEvent('didSaveContentTypeLayout');
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  const handleSubmitMetaForm = e => {
    e.preventDefault();
    dispatch({
      type: 'SUBMIT_META_FORM',
    });
    toggleModalForm();
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

  const moveRow = (dragRowIndex, hoverRowIndex) => {
    dispatch({
      type: 'MOVE_ROW',
      dragRowIndex,
      hoverRowIndex,
    });
  };

  const toggleModalForm = () => {
    setIsModalFormOpen(prevState => !prevState);
  };

  const renderForm = () =>
    getForm().map((meta, index) => {
      const formType = get(getAttributes, [metaToEdit, 'type']);

      if ((formType === 'group' || formType === 'media') && meta !== 'label') {
        return null;
      }

      if (
        (formType === 'json' || formType === 'boolean') &&
        meta === 'placeholder'
      ) {
        return null;
      }

      if (formType === 'richtext' && meta === 'editable') {
        return null;
      }

      return (
        <div className="col-6" key={meta}>
          <FormattedMessage
            id={`${pluginId}.containers.SettingPage.editSettings.entry.title.description`}
          >
            {description => (
              <FormattedMessage
                id={get(
                  getInputProps(meta),
                  'label.id',
                  'app.utils.defaultMessage'
                )}
              >
                {label => (
                  <Input
                    autoFocus={index === 0}
                    description={meta === 'mainField' ? description : ''}
                    label={label}
                    name={meta}
                    type={getInputProps(meta).type}
                    onBlur={() => {}}
                    value={get(metaForm, meta, '')}
                    onChange={handleChangeMeta}
                    options={getSelectedItemSelectOptions(formType)}
                  />
                )}
              </FormattedMessage>
            )}
          </FormattedMessage>
        </div>
      );
    });

  return (
    <LayoutDndProvider
      attributes={getAttributes}
      buttonData={getEditRemainingFields()}
      goTo={push}
      groupLayouts={groupLayouts}
      layout={getEditLayout()}
      metadatas={get(modifiedData, ['metadatas'], {})}
      moveItem={moveItem}
      moveRow={moveRow}
      onAddData={name => {
        dispatch({
          type: 'ON_ADD_DATA',
          name,
        });
      }}
      relationsLayout={getRelationsLayout()}
      removeField={(rowIndex, fieldIndex) => {
        dispatch({
          type: 'REMOVE_FIELD',
          rowIndex,
          fieldIndex,
        });
      }}
      setEditFieldToSelect={name => {
        dispatch({
          type: 'SET_FIELD_TO_EDIT',
          name,
        });
        toggleModalForm();
      }}
      selectedItemName={metaToEdit}
    >
      <SettingsViewWrapper
        inputs={[
          {
            label: {
              id: `${pluginId}.containers.SettingPage.editSettings.entry.title`,
            },
            description: {
              id: `${pluginId}.containers.SettingPage.editSettings.entry.title.description`,
            },
            type: 'select',
            name: 'settings.mainField',
            customBootstrapClass: 'col-md-4',
            selectOptions: ['id'],
            didCheckErrors: false,
            validations: {},
          },
        ]}
        initialData={initialData}
        isLoading={isLoading}
        modifiedData={modifiedData}
        onChange={handleChange}
        onConfirmReset={() => {
          dispatch({
            type: 'ON_RESET',
          });
        }}
        onConfirmSubmit={handleConfirm}
        slug={slug || groupSlug}
        isEditSettings
      >
        <div className="row">
          <LayoutTitle className={fieldsReorderClassName}>
            <FormTitle
              title={`${pluginId}.global.displayedFields`}
              description={`${pluginId}.containers.SettingPage.editSettings.description`}
            />
          </LayoutTitle>
          {type !== 'groups' && (
            <LayoutTitle className="col-4">
              <FormTitle
                title={`${pluginId}.containers.SettingPage.relations`}
                description={`${pluginId}.containers.SettingPage.editSettings.description`}
              />
            </LayoutTitle>
          )}

          <FieldsReorder className={fieldsReorderClassName} />
          {type !== 'groups' && (
            <SortableList
              addItem={name => {
                dispatch({
                  type: 'ADD_RELATION',
                  name,
                });
              }}
              buttonData={getEditRelationsRemaingFields()}
              moveItem={(dragIndex, hoverIndex) => {
                dispatch({
                  type: 'MOVE_RELATION',
                  dragIndex,
                  hoverIndex,
                });
              }}
              removeItem={index => {
                dispatch({
                  type: 'REMOVE_RELATION',
                  index,
                });
              }}
            />
          )}
        </div>
      </SettingsViewWrapper>
      {/* Temporary in dev need to check the build the input lib causes glimpse */}
      <div style={{ display: 'none' }}>
        <Input type="text" name="hidden" />
        <Input type="bool" name="hiddenn" />
      </div>
      <PopupForm
        headerId={`${pluginId}.containers.EditSettingsView.modal-form.edit-field`}
        isOpen={isModalFormOpen}
        onClosed={() => {
          dispatch({
            type: 'UNSET_FIELD_TO_EDIT',
          });
        }}
        onSubmit={handleSubmitMetaForm}
        onToggle={toggleModalForm}
        renderForm={renderForm}
        subHeaderContent={metaToEdit}
      />
    </LayoutDndProvider>
  );
};

EditSettingsView.defaultProps = {
  slug: null,
};

EditSettingsView.propTypes = {
  deleteLayout: PropTypes.func.isRequired,
  groupsAndModelsMainPossibleMainFields: PropTypes.object.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func,
  }).isRequired,
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }).isRequired,
  slug: PropTypes.string,
};

export default EditSettingsView;
