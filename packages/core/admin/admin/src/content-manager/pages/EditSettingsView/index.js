import React, { useReducer, useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import upperFirst from 'lodash/upperFirst';
import flatMap from 'lodash/flatMap';
import isEqual from 'lodash/isEqual';
import get from 'lodash/get';
import { useHistory } from 'react-router-dom';
import { Main } from '@strapi/parts/Main';
import { HeaderLayout, ContentLayout } from '@strapi/parts/Layout';
import { Link } from '@strapi/parts/Link';
import { Button } from '@strapi/parts/Button';
import { Box } from '@strapi/parts/Box';
import { H3 } from '@strapi/parts/Text';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Select, Option } from '@strapi/parts/Select';
import { Stack } from '@strapi/parts/Stack';
import { Divider } from '@strapi/parts/Divider';
import BackIcon from '@strapi/icons/BackIcon';
import CheckIcon from '@strapi/icons/CheckIcon';
import { Helmet } from 'react-helmet';
import { getTrad } from '../../utils';
import reducer, { initialState } from './reducer';
import init from './init';
import DisplayedFields from './components/DisplayedFields';
import RelationalFields from './components/RelationalFields';
import ModalForm from './ModalForm';
import LayoutDndProvider from '../../components/LayoutDndProvider';

const EditSettingsView = ({ mainLayout, components, isContentTypeView, slug }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, mainLayout, components)
  );
  const { goBack } = useHistory();
  const [isModalFormOpen, setIsModalFormOpen] = useState(false);
  const { componentLayouts, initialData, modifiedData, metaToEdit, metaForm } = reducerState;
  const { formatMessage } = useIntl();
  const modelName = get(mainLayout, ['info', 'name'], '');
  const attributes = get(modifiedData, ['attributes'], {});

  const entryTitleOptions = Object.keys(attributes).filter(attr => {
    const type = get(attributes, [attr, 'type'], '');

    return (
      ![
        'dynamiczone',
        'json',
        'text',
        'relation',
        'component',
        'boolean',
        'date',
        'media',
        'richtext',
        'timestamp',
      ].includes(type) && !!type
    );
  });
  const editLayout = get(modifiedData, ['layouts', 'edit'], []);
  const displayedFields = flatMap(editLayout, 'rowContent');
  const editLayoutRemainingFields = Object.keys(modifiedData.attributes)
    .filter(attr => {
      if (!isContentTypeView) {
        return true;
      }

      return get(modifiedData, ['attributes', attr, 'type'], '') !== 'relation';
    })
    .filter(attr => get(modifiedData, ['metadatas', attr, 'edit', 'visible'], false) === true)
    .filter(attr => {
      return displayedFields.findIndex(el => el.name === attr) === -1;
    })
    .sort();
  const relationsLayout = get(modifiedData, ['layouts', 'editRelations'], []);
  const editRelationsLayoutRemainingFields = Object.keys(attributes)
    .filter(attr => attributes[attr].type === 'relation')
    .filter(attr => relationsLayout.indexOf(attr) === -1);

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value,
    });
  };

  const handleToggleModal = () => {
    setIsModalFormOpen(prevState => !prevState);
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
      setEditFieldToSelect={name => {
        dispatch({
          type: 'SET_FIELD_TO_EDIT',
          name,
        });
        handleToggleModal();
      }}
    >
      <Main>
        <Helmet
          title={formatMessage(
            {
              id: getTrad('components.SettingsViewWrapper.pluginHeader.title'),
              defaultMessage: `Configure the view - ${upperFirst(modelName)}`,
            },
            { name: upperFirst(modelName) }
          )}
        />
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
              startIcon={<BackIcon />}
              onClick={e => {
                e.preventDefault();
                goBack();
              }}
              to="/"
            >
              {formatMessage({
                id: 'app.components.go-back',
                defaultMessage: 'Go back',
              })}
            </Link>
          }
          primaryAction={
            <Button
              disabled={isEqual(initialData, modifiedData)}
              startIcon={<CheckIcon />}
              type="submit"
            >
              {formatMessage({ id: 'form.button.save', defaultMessage: 'Save' })}
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
            <Stack size={4}>
              <H3 as="h2">
                {formatMessage({
                  id: getTrad('containers.SettingPage.settings'),
                  defaultMessage: 'Settings',
                })}
              </H3>
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
                    onChange={value => {
                      handleChange({
                        target: { name: 'settings.mainField', value: value === '' ? null : value },
                      });
                    }}
                    value={modifiedData.settings.mainField}
                  >
                    {entryTitleOptions.map(attribute => (
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
              <H3>
                {formatMessage({
                  id: getTrad('containers.SettingPage.view'),
                  defaultMessage: 'View',
                })}
              </H3>
              <Grid gap={4}>
                <GridItem col={isContentTypeView ? 8 : 12} s={12}>
                  <DisplayedFields
                    attributes={attributes}
                    editLayout={editLayout}
                    editLayoutRemainingFields={editLayoutRemainingFields}
                    onAddField={field => {
                      dispatch({
                        type: 'ON_ADD_FIELD',
                        name: field,
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
                </GridItem>
                {isContentTypeView && (
                  <GridItem col={4} s={12}>
                    <RelationalFields
                      editRelationsLayoutRemainingFields={editRelationsLayoutRemainingFields}
                      relationsLayout={relationsLayout}
                      onAddField={name => dispatch({ type: 'ADD_RELATION', name })}
                      onRemoveField={index => dispatch({ type: 'REMOVE_RELATION', index })}
                    />
                  </GridItem>
                )}
              </Grid>
            </Stack>
          </Box>
        </ContentLayout>
        {isModalFormOpen && (
          <ModalForm
            onSubmit={e => console.log(e)}
            onToggle={handleToggleModal}
            type={get(attributes, [metaToEdit, 'type'], '')}
          />
        )}
      </Main>
    </LayoutDndProvider>
  );
};

EditSettingsView.defaultProps = {
  isContentTypeView: false,
};

EditSettingsView.propTypes = {
  components: PropTypes.object.isRequired,
  isContentTypeView: PropTypes.bool,
  mainLayout: PropTypes.shape({
    attributes: PropTypes.object.isRequired,
    info: PropTypes.object.isRequired,
    layouts: PropTypes.shape({
      list: PropTypes.array.isRequired,
      editRelations: PropTypes.array.isRequired,
      edit: PropTypes.array.isRequired,
    }).isRequired,
    metadatas: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,
  }).isRequired,
  slug: PropTypes.string.isRequired,
};

export default EditSettingsView;

// import React, { useCallback, useMemo, useReducer, useState } from 'react';
// import PropTypes from 'prop-types';
// import { useHistory } from 'react-router-dom';
// import { useSelector, shallowEqual } from 'react-redux';
// import { cloneDeep, flatMap, get, set, pick } from 'lodash';
// import { useTracking, useNotification } from '@strapi/helper-plugin';
// import { Inputs as Input } from '@buffetjs/custom';
// import { FormattedMessage } from 'react-intl';
// import { axiosInstance } from '../../../core/utils';
// import { getRequestUrl, getTrad } from '../../utils';
// import FieldsReorder from '../../components/FieldsReorder';
// import FormTitle from '../../components/FormTitle';
// import LayoutTitle from '../../components/LayoutTitle';
// import PopupForm from '../../components/PopupForm';
// import SettingsViewWrapper from '../../components/SettingsViewWrapper';
// import SortableList from '../../components/SortableList';
// import { makeSelectModelAndComponentSchemas } from '../App/selectors';
// import LayoutDndProvider from '../../components/LayoutDndProvider';
// import init from './init';
// import reducer, { initialState } from './reducer';
// import { createPossibleMainFieldsForModelsAndComponents, getInputProps } from './utils';
// import { unformatLayout } from './utils/layout';
// import LinkToCTB from './LinkToCTB';

// const EditSettingsView = ({ components, mainLayout, isContentTypeView, slug, updateLayout }) => {
//   const { push } = useHistory();
//   const { trackUsage } = useTracking();
//   const toggleNotification = useNotification();

//   const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
//     init(initialState, mainLayout, components)
//   );
//   const [isModalFormOpen, setIsModalFormOpen] = useState(false);
//   const [isDraggingSibling, setIsDraggingSibling] = useState(false);

//   const schemasSelector = useMemo(makeSelectModelAndComponentSchemas, []);
//   const { schemas } = useSelector(state => schemasSelector(state), shallowEqual);

//   const { componentLayouts, initialData, metaToEdit, modifiedData, metaForm } = reducerState;

//   const componentsAndModelsPossibleMainFields = useMemo(() => {
//     return createPossibleMainFieldsForModelsAndComponents(schemas);
//   }, [schemas]);

//   const fieldsReorderClassName = isContentTypeView ? 'col-8' : 'col-12';

//   const attributes = useMemo(() => get(modifiedData, 'attributes', {}), [modifiedData]);
//   const editLayout = modifiedData.layouts.edit;
//   const relationsLayout = modifiedData.layouts.editRelations;
//   const editRelationsLayoutRemainingFields = useMemo(() => {
//     return Object.keys(attributes)
//       .filter(attr => attributes[attr].type === 'relation')
//       .filter(attr => relationsLayout.indexOf(attr) === -1);
//   }, [attributes, relationsLayout]);

//   const formToDisplay = useMemo(() => {
//     if (!metaToEdit) {
//       return [];
//     }

//     const associatedMetas = get(modifiedData, ['metadatas', metaToEdit, 'edit'], {});

//     return Object.keys(associatedMetas).filter(meta => meta !== 'visible');
//   }, [metaToEdit, modifiedData]);

//   const editLayoutRemainingFields = useMemo(() => {
//     const displayedFields = flatMap(modifiedData.layouts.edit, 'rowContent');

//     return Object.keys(modifiedData.attributes)
//       .filter(attr => {
//         if (!isContentTypeView) {
//           return true;
//         }

//         return get(modifiedData, ['attributes', attr, 'type'], '') !== 'relation';
//       })
//       .filter(attr => get(modifiedData, ['metadatas', attr, 'edit', 'visible'], false) === true)
//       .filter(attr => {
//         return displayedFields.findIndex(el => el.name === attr) === -1;
//       })
//       .sort();
//   }, [isContentTypeView, modifiedData]);

//   const getSelectedItemSelectOptions = useCallback(
//     formType => {
//       if (formType !== 'relation' && formType !== 'component') {
//         return [];
//       }

//       const targetKey = formType === 'component' ? 'component' : 'targetModel';
//       const key = get(modifiedData, ['attributes', metaToEdit, targetKey], '');

//       return get(componentsAndModelsPossibleMainFields, [key], []);
//     },

//     [metaToEdit, componentsAndModelsPossibleMainFields, modifiedData]
//   );

//   const handleChange = ({ target: { name, value } }) => {
//     dispatch({
//       type: 'ON_CHANGE',
//       keys: name.split('.'),
//       value,
//     });
//   };

//   const handleChangeMeta = ({ target: { name, value } }) => {
//     dispatch({
//       type: 'ON_CHANGE_META',
//       keys: name.split('.'),
//       value,
//     });
//   };

//   const handleConfirm = async () => {
//     try {
//       const body = pick(cloneDeep(modifiedData), ['layouts', 'metadatas', 'settings']);

//       // We need to send the unformated edit layout
//       set(body, 'layouts.edit', unformatLayout(body.layouts.edit));

//       const requestURL = isContentTypeView
//         ? getRequestUrl(`content-types/${slug}/configuration`)
//         : getRequestUrl(`components/${slug}/configuration`);

//       const {
//         data: { data },
//       } = await axiosInstance.put(requestURL, body);

//       if (updateLayout) {
//         updateLayout(data);
//       }

//       dispatch({
//         type: 'SUBMIT_SUCCEEDED',
//       });

//       trackUsage('didEditEditSettings');
//     } catch (err) {
//       toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
//     }
//   };

//   const handleSubmitMetaForm = e => {
//     e.preventDefault();
//     dispatch({
//       type: 'SUBMIT_META_FORM',
//     });
//     toggleModalForm();
//   };

//   const moveItem = (dragIndex, hoverIndex, dragRowIndex, hoverRowIndex) => {
//     // Same row = just reorder
//     if (dragRowIndex === hoverRowIndex) {
//       dispatch({
//         type: 'REORDER_ROW',
//         dragRowIndex,
//         dragIndex,
//         hoverIndex,
//       });
//     } else {
//       dispatch({
//         type: 'REORDER_DIFF_ROW',
//         dragIndex,
//         hoverIndex,
//         dragRowIndex,
//         hoverRowIndex,
//       });
//     }
//   };

//   const moveRow = (fromIndex, toIndex) => {
//     dispatch({
//       type: 'MOVE_ROW',
//       fromIndex,
//       toIndex,
//     });
//   };

//   const toggleModalForm = () => {
//     setIsModalFormOpen(prevState => !prevState);
//   };

//   const renderForm = () =>
//     formToDisplay.map((meta, index) => {
//       const formType = get(attributes, [metaToEdit, 'type']);

//       if (formType === 'dynamiczone' && !['label', 'description'].includes(meta)) {
//         return null;
//       }

//       if ((formType === 'component' || formType === 'media') && meta !== 'label') {
//         return null;
//       }

//       if ((formType === 'json' || formType === 'boolean') && meta === 'placeholder') {
//         return null;
//       }

//       if (formType === 'richtext' && meta === 'editable') {
//         return null;
//       }

//       return (
//         <div className="col-6" key={meta}>
//           <FormattedMessage
//             id={getTrad('containers.SettingPage.editSettings.relation-field.description')}
//           >
//             {description => (
//               <FormattedMessage
//                 id={get(getInputProps(meta), 'label.id', 'app.utils.defaultMessage')}
//               >
//                 {label => (
//                   <Input
//                     autoFocus={index === 0}
//                     description={meta === 'mainField' ? description[0] : ''}
//                     label={label[0]}
//                     name={meta}
//                     type={getInputProps(meta).type}
//                     value={get(metaForm, meta, '')}
//                     onChange={handleChangeMeta}
//                     options={getSelectedItemSelectOptions(formType)}
//                   />
//                 )}
//               </FormattedMessage>
//             )}
//           </FormattedMessage>
//         </div>
//       );
//     });

//   return (
//     <LayoutDndProvider
//       attributes={attributes}
//       buttonData={editLayoutRemainingFields}
//       componentLayouts={componentLayouts}
//       goTo={push}
//       isDraggingSibling={isDraggingSibling}
//       layout={editLayout}
//       metadatas={get(modifiedData, ['metadatas'], {})}
//       moveItem={moveItem}
//       moveRow={moveRow}
//       onAddData={name => {
//         dispatch({
//           type: 'ON_ADD_FIELD',
//           name,
//         });
//       }}
//       relationsLayout={relationsLayout}
//       removeField={(rowIndex, fieldIndex) => {
//         dispatch({
//           type: 'REMOVE_FIELD',
//           rowIndex,
//           fieldIndex,
//         });
//       }}
//       setEditFieldToSelect={name => {
//         dispatch({
//           type: 'SET_FIELD_TO_EDIT',
//           name,
//         });
//         toggleModalForm();
//       }}
//       setIsDraggingSibling={setIsDraggingSibling}
//       selectedItemName={metaToEdit}
//     >
//       <SettingsViewWrapper
//         inputs={[
//           {
//             label: {
//               id: getTrad('containers.SettingPage.editSettings.entry.title'),
//             },
//             description: {
//               id: getTrad('containers.SettingPage.editSettings.entry.title.description'),
//             },
//             type: 'select',
//             name: 'settings.mainField',
//             customBootstrapClass: 'col-md-4',
//             selectOptions: ['id'],
//             didCheckErrors: false,
//             validations: {},
//           },
//         ]}
//         initialData={initialData}
//         isLoading={false}
//         modifiedData={modifiedData}
//         name={modifiedData.info.name}
//         onChange={handleChange}
//         onConfirmReset={() => {
//           dispatch({
//             type: 'ON_RESET',
//           });
//         }}
//         onConfirmSubmit={handleConfirm}
//         slug={slug}
//         isEditSettings
//       >
//         <div className="row">
//           <LayoutTitle className={fieldsReorderClassName}>
//             <div
//               style={{
//                 display: 'flex',
//                 justifyContent: 'space-between',
//               }}
//             >
//               <div>
//                 <FormTitle
//                   title={getTrad('global.displayedFields')}
//                   description={getTrad('containers.SettingPage.editSettings.description')}
//                 />
//               </div>
//               <div
//                 style={{
//                   marginTop: -6,
//                 }}
//               >
//                 <LinkToCTB
//                   modifiedData={modifiedData}
//                   slug={slug}
//                   type={isContentTypeView ? 'content-types' : 'components'}
//                 />
//               </div>
//             </div>
//           </LayoutTitle>
//           {isContentTypeView && (
//             <LayoutTitle className="col-4">
//               <FormTitle
//                 title={getTrad('containers.SettingPage.relations')}
//                 description={getTrad('containers.SettingPage.editSettings.description')}
//               />
//             </LayoutTitle>
//           )}

//           <FieldsReorder className={fieldsReorderClassName} />
//           {isContentTypeView && (
//             <SortableList
//               addItem={name => {
//                 dispatch({
//                   type: 'ADD_RELATION',
//                   name,
//                 });
//               }}
//               buttonData={editRelationsLayoutRemainingFields}
//               moveItem={(fromIndex, toIndex) => {
//                 dispatch({
//                   type: 'MOVE_RELATION',
//                   fromIndex,
//                   toIndex,
//                 });
//               }}
//               removeItem={index => {
//                 dispatch({
//                   type: 'REMOVE_RELATION',
//                   index,
//                 });
//               }}
//             />
//           )}
//         </div>
//       </SettingsViewWrapper>

//       <PopupForm
//         headerId={getTrad('containers.EditSettingsView.modal-form.edit-field')}
//         isOpen={isModalFormOpen}
//         onClosed={() => {
//           dispatch({
//             type: 'UNSET_FIELD_TO_EDIT',
//           });
//         }}
//         onSubmit={handleSubmitMetaForm}
//         onToggle={toggleModalForm}
//         renderForm={renderForm}
//         subHeaderContent={metaToEdit}
//         type={get(attributes, [metaToEdit, 'type'], '')}
//       />
//     </LayoutDndProvider>
//   );
// };

// EditSettingsView.defaultProps = {
//   isContentTypeView: false,
//   updateLayout: null,
// };

// EditSettingsView.propTypes = {
//   components: PropTypes.object.isRequired,
//   mainLayout: PropTypes.shape({
//     attributes: PropTypes.object.isRequired,
//     info: PropTypes.object.isRequired,
//     layouts: PropTypes.shape({
//       list: PropTypes.array.isRequired,
//       editRelations: PropTypes.array.isRequired,
//       edit: PropTypes.array.isRequired,
//     }).isRequired,
//     metadatas: PropTypes.object.isRequired,
//     options: PropTypes.object.isRequired,
//   }).isRequired,
//   isContentTypeView: PropTypes.bool,

//   slug: PropTypes.string.isRequired,
//   updateLayout: PropTypes.func,
// };

// export default EditSettingsView;
