import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory, useParams } from 'react-router-dom';
import { cloneDeep, flatMap, get, set } from 'lodash';
import { request, useGlobalContext } from 'strapi-helper-plugin';
import { Inputs as Input } from '@buffetjs/custom';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import getRequestUrl from '../../utils/getRequestUrl';
import FieldsReorder from '../../components/FieldsReorder';
import FormTitle from '../../components/FormTitle';
import LayoutTitle from '../../components/LayoutTitle';
import PopupForm from '../../components/PopupForm';
import SettingsViewWrapper from '../../components/SettingsViewWrapper';
import SortableList from '../../components/SortableList';
import { unformatLayout } from '../../utils/layout';
import getInjectedComponents from '../../utils/getComponents';
import LayoutDndProvider from '../LayoutDndProvider';
import getInputProps from './utils/getInputProps';
import init from './init';
import reducer, { initialState } from './reducer';

const EditSettingsView = ({
  components,
  mainLayout,
  // currentEnvironment,
  // deleteLayout,
  // deleteLayouts,
  componentsAndModelsMainPossibleMainFields,
  isContentTypeView,
  // history: { push },
  // plugins,
  slug,
}) => {
  const { push } = useHistory();
  const { componentSlug } = useParams();
  const { emitEvent } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, mainLayout, components)
  );
  const [isModalFormOpen, setIsModalFormOpen] = useState(false);
  const [isDraggingSibling, setIsDraggingSibling] = useState(false);
  const { componentLayouts, initialData, metaToEdit, modifiedData, metaForm } = reducerState.toJS();

  const fieldsReorderClassName = isContentTypeView ? 'col-8' : 'col-12';

  const attributes = useMemo(() => get(modifiedData, 'attributes', {}), [modifiedData]);
  const editLayout = modifiedData.layouts.edit;
  const relationsLayout = modifiedData.layouts.editRelations;
  const editRelationsLayoutRemainingFields = useMemo(() => {
    return Object.keys(attributes)
      .filter(attr => attributes[attr].type === 'relation')
      .filter(attr => relationsLayout.indexOf(attr) === -1);
  }, [attributes, relationsLayout]);

  const getForm = () =>
    Object.keys(get(modifiedData, ['metadatas', metaToEdit, 'edit'], {})).filter(
      meta => meta !== 'visible'
    );

  const editLayoutRemainingFields = useMemo(() => {
    const displayedFields = flatMap(modifiedData.layouts.edit, 'rowContent');

    return Object.keys(modifiedData.attributes)
      .filter(attr => {
        if (!isContentTypeView) {
          return true;
        }

        return get(modifiedData, ['attributes', attr, 'type'], '') !== 'relation';
      })
      .filter(attr => get(modifiedData, ['metadatas', attr, 'edit', 'visible'], false) === true)
      .filter(attr => {
        return displayedFields.findIndex(el => el.name === attr) === -1;
      });
  }, [isContentTypeView, modifiedData]);

  const getSelectedItemSelectOptions = useCallback(
    formType => {
      if (formType !== 'relation' && formType !== 'component') {
        return [];
      }

      const targetKey = formType === 'component' ? 'component' : 'targetModel';
      const key = get(modifiedData, ['schema', 'attributes', metaToEdit, targetKey], '');

      return get(componentsAndModelsMainPossibleMainFields, [key], []);
    },

    [metaToEdit, componentsAndModelsMainPossibleMainFields, modifiedData]
  );

  // useEffect(() => {
  //   const getData = async () => {
  //     try {
  //       const { data } = await request(getRequestUrl(`${type}/${slug || componentSlug}`), {
  //         method: 'GET',
  //         signal,
  //       });

  //       dispatch({
  //         type: 'GET_DATA_SUCCEEDED',
  //         data: data.contentType || data.component,
  //         componentLayouts: data.components,
  //       });
  //     } catch (err) {
  //       if (err.code !== 20) {
  //         strapi.notification.error('notification.error');
  //       }
  //     }
  //   };

  //   getData();

  //   return () => {
  //     abortController.abort();
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [slug, type, componentSlug]);

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
      delete body.isComponent;
      delete body.category;
      delete body.apiID;

      // await request(getRequestUrl(`${type}/${slug || componentSlug}`), {
      //   method: 'PUT',
      //   body,
      //   signal,
      // });

      dispatch({
        type: 'SUBMIT_SUCCEEDED',
      });

      if (slug) {
        // TODO
        // deleteLayout(slug);
      }

      if (componentSlug) {
        // deleteLayouts();
      }

      emitEvent('didEditEditSettings');
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
      const formType = get(attributes, [metaToEdit, 'type']);

      if (formType === 'dynamiczone' && !['label', 'description'].includes(meta)) {
        return null;
      }

      if ((formType === 'component' || formType === 'media') && meta !== 'label') {
        return null;
      }

      if ((formType === 'json' || formType === 'boolean') && meta === 'placeholder') {
        return null;
      }

      if (formType === 'richtext' && meta === 'editable') {
        return null;
      }

      return (
        <div className="col-6" key={meta}>
          <FormattedMessage
            id={`${pluginId}.containers.SettingPage.editSettings.relation-field.description`}
          >
            {description => (
              <FormattedMessage
                id={get(getInputProps(meta), 'label.id', 'app.utils.defaultMessage')}
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
      attributes={attributes}
      buttonData={editLayoutRemainingFields}
      componentLayouts={componentLayouts}
      goTo={push}
      isDraggingSibling={isDraggingSibling}
      layout={editLayout}
      metadatas={get(modifiedData, ['metadatas'], {})}
      moveItem={moveItem}
      moveRow={moveRow}
      onAddData={name => {
        dispatch({
          type: 'ON_ADD_DATA',
          name,
        });
      }}
      relationsLayout={relationsLayout}
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
      setIsDraggingSibling={setIsDraggingSibling}
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
        isLoading={false}
        modifiedData={modifiedData}
        name={modifiedData.info.name}
        onChange={handleChange}
        onConfirmReset={() => {
          dispatch({
            type: 'ON_RESET',
          });
        }}
        onConfirmSubmit={handleConfirm}
        slug={slug || componentSlug}
        isEditSettings
      >
        <div className="row">
          <LayoutTitle className={fieldsReorderClassName}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <FormTitle
                  title={`${pluginId}.global.displayedFields`}
                  description={`${pluginId}.containers.SettingPage.editSettings.description`}
                />
              </div>
              <div
                style={{
                  marginTop: -6,
                }}
              >
                {/* // TODO */}
                {getInjectedComponents(
                  'editSettingsView',
                  'left.links',
                  {},
                  'production',
                  slug,
                  push,
                  { componentSlug, type: 'content-type', modifiedData }
                )}
              </div>
            </div>
          </LayoutTitle>
          {isContentTypeView && (
            <LayoutTitle className="col-4">
              <FormTitle
                title={`${pluginId}.containers.SettingPage.relations`}
                description={`${pluginId}.containers.SettingPage.editSettings.description`}
              />
            </LayoutTitle>
          )}

          <FieldsReorder className={fieldsReorderClassName} />
          {isContentTypeView && (
            <SortableList
              addItem={name => {
                dispatch({
                  type: 'ADD_RELATION',
                  name,
                });
              }}
              buttonData={editRelationsLayoutRemainingFields}
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
        type={get(attributes, [metaToEdit, 'type'], '')}
      />
    </LayoutDndProvider>
  );
};

EditSettingsView.defaultProps = {
  slug: null,
};

EditSettingsView.propTypes = {
  isContentTypeView: PropTypes.bool.isRequired,
  // currentEnvironment: PropTypes.string.isRequired,
  // deleteLayout: PropTypes.func.isRequired,
  // deleteLayouts: PropTypes.func.isRequired,
  // componentsAndModelsMainPossibleMainFields: PropTypes.object.isRequired,
  // plugins: PropTypes.object.isRequired,
  // slug: PropTypes.string,
};

export default EditSettingsView;
