import React, {
  memo,
  useCallback,
  useMemo,
  useEffect,
  // useState,
  useReducer,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import {
  // cloneDeep,
  get,
  // isEqual,
} from 'lodash';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import {
  BackHeader,
  getQueryParameters,
  // LoadingIndicatorPage,
  LiLink,
  PluginHeader,
  // PopUpWarning,
  // getYupInnerErrors,
  // request,
  templateObject,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import { EditViewProvider } from '../../contexts/EditView';
import Container from '../../components/Container';
import DynamicZone from '../../components/DynamicZone';
import FormWrapper from '../../components/FormWrapper';
// import ComponentField from '../../components/ComponentField';
// import Inputs from '../../components/Inputs';
import SelectWrapper from '../../components/SelectWrapper';
// import createYupSchema from './utils/schema';
// import setDefaultForm from './utils/createDefaultForm';
import getInjectedComponents from './utils/getComponents';
import init from './init';
import reducer, { initialState } from './reducer';
import {
  LinkWrapper,
  // MainWrapper,
  SubWrapper,
} from './components';
// import {
//   getMediaAttributes,
//   cleanData,
//   mapDataKeysToFilesToUpload,
// } from './utils/formatData';

// import {
//   getDefaultComponentValues,
//   retrieveDisplayedComponents,
//   retrieveComponentsLayoutsToFetch,
// } from './utils/components';
import createAttributesLayout from './utils/createAttributesLayout';
// const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

const EditView = ({
  currentEnvironment,
  emitEvent,
  layouts,
  plugins,
  slug,
}) => {
  const formatLayoutRef = useRef();
  formatLayoutRef.current = createAttributesLayout;
  // Retrieve push to programmatically navigate between views
  const { push } = useHistory();
  // Retrieve the search
  const { search } = useLocation();

  // Retrieve the document's id
  const { id } = useParams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState)
  );
  const currentContentTypeLayoutData = useMemo(
    () => get(layouts, [slug, 'contentType'], {}),
    [layouts, slug]
  );
  const currentContentTypeLayout = useMemo(
    () => get(currentContentTypeLayoutData, ['layouts', 'edit'], []),
    [currentContentTypeLayoutData]
  );
  const currentContentTypeLayoutRelations = useMemo(
    () => get(currentContentTypeLayoutData, ['layouts', 'editRelations'], []),
    [currentContentTypeLayoutData]
  );
  const currentContentTypeSchema = useMemo(
    () => get(currentContentTypeLayoutData, ['schema'], {}),
    [currentContentTypeLayoutData]
  );
  const source = getQueryParameters(search, 'source');
  const getFieldType = useCallback(
    fieldName => {
      return get(
        currentContentTypeSchema,
        ['attributes', fieldName, 'type'],
        ''
      );
    },
    [currentContentTypeSchema]
  );
  // Check if a block is a dynamic zone
  const isDynamicZone = useCallback(
    block => {
      return block.every(subBlock => {
        return subBlock.every(obj => getFieldType(obj.name) === 'dynamiczone');
      });
    },
    [getFieldType]
  );

  const isCreatingEntry = id === 'create';

  useEffect(() => {
    // Force state to be cleared when navigation from one entry to another
    dispatch({ type: 'RESET_PROPS' });
    dispatch({
      type: 'SET_LAYOUT_DATA',
      formattedContentTypeLayout: formatLayoutRef.current(
        currentContentTypeLayout,
        currentContentTypeSchema.attributes
      ),
    });
  }, [currentContentTypeLayout, currentContentTypeSchema.attributes]);

  const { formattedContentTypeLayout, initialData } = reducerState.toJS();

  const currentContentTypeMainField = get(
    currentContentTypeLayoutData,
    ['settings', 'mainField'],
    'id'
  );
  const pluginHeaderTitle = isCreatingEntry
    ? { id: `${pluginId}.containers.Edit.pluginHeader.title.new` }
    : templateObject({ mainField: currentContentTypeMainField }, initialData)
        .mainField;

  // We can't use the getQueryParameters helper here because the search
  // can contain 'redirectUrl' several times since we can navigate between documents
  const redirectURL = search
    .split('redirectUrl=')
    .filter((_, index) => index !== 0)
    .join('');
  const redirectToPreviousPage = () => push(redirectURL);

  const handleSubmit = async e => {
    e.preventDefault();
  };

  return (
    <EditViewProvider>
      <BackHeader onClick={() => redirectToPreviousPage()} />
      <Container className="container-fluid">
        <form onSubmit={handleSubmit}>
          <PluginHeader
            actions={[
              {
                label: `${pluginId}.containers.Edit.reset`,
                kind: 'secondary',
                onClick: () => {
                  // toggleWarningCancel();
                },
                type: 'button',
                // disabled: isSubmitting, // TODO STATE WHEN SUBMITING
              },
              {
                kind: 'primary',
                label: `${pluginId}.containers.Edit.submit`,
                type: 'submit',
                // loader: isSubmitting,
                // style: isSubmitting ? { marginRight: '18px' } : {},
                // disabled: isSubmitting, // TODO STATE WHEN SUBMITING
              },
            ]}
            subActions={
              isCreatingEntry
                ? []
                : [
                    {
                      label: 'app.utils.delete',
                      kind: 'delete',
                      onClick: () => {
                        // toggleWarningDelete();
                      },
                      type: 'button',
                      // disabled: isSubmitting, // TODO STATE WHEN SUBMITING
                    },
                  ]
            }
            title={pluginHeaderTitle}
          />
          <div className="row">
            <div className="col-md-12 col-lg-9">
              {formattedContentTypeLayout.map((block, blockIndex) => {
                if (isDynamicZone(block)) {
                  const {
                    0: {
                      0: { name },
                    },
                  } = block;

                  return <DynamicZone name={name} />;
                }

                return <FormWrapper key={blockIndex}>SUBBLOCK</FormWrapper>;
              })}
            </div>

            <div className="col-md-12 col-lg-3">
              {currentContentTypeLayoutRelations.length > 0 && (
                <SubWrapper
                  style={{ padding: '0 20px 1px', marginBottom: '26px' }}
                >
                  <div style={{ paddingTop: '22px' }}>
                    {currentContentTypeLayoutRelations.map(relationName => {
                      const relation = get(
                        currentContentTypeLayoutData,
                        ['schema', 'attributes', relationName],
                        {}
                      );
                      const relationMetas = get(
                        currentContentTypeLayoutData,
                        ['metadatas', relationName, 'edit'],
                        {}
                      );
                      const value = get({}, [relationName], null);

                      return (
                        <SelectWrapper
                          {...relation}
                          {...relationMetas}
                          key={relationName}
                          name={relationName}
                          relationsType={relation.relationType}
                          value={value}
                        />
                      );
                    })}
                  </div>
                </SubWrapper>
              )}
              <LinkWrapper>
                <ul>
                  <LiLink
                    message={{
                      id: 'app.links.configure-view',
                    }}
                    icon="layout"
                    key={`${pluginId}.link`}
                    // url={`/plugins/${pluginId}/ctm-configurations/edit-settings/content-types/${slug}${`?source=${source}`}`}
                    url={`ctm-configurations/edit-settings/content-types${`?source=${source}`}`}
                    onClick={() => {
                      // emitEvent('willEditContentTypeLayoutFromEditView');
                    }}
                  />
                  {getInjectedComponents(
                    'right.links',
                    plugins,
                    currentEnvironment,
                    slug,
                    source,
                    emitEvent
                  )}
                </ul>
              </LinkWrapper>
            </div>
          </div>
        </form>
      </Container>
    </EditViewProvider>
  );
};

EditView.defaultProps = {
  currentEnvironment: 'production',
  emitEvent: () => {},
  plugins: {},
};

EditView.propTypes = {
  currentEnvironment: PropTypes.string,
  emitEvent: PropTypes.func,
  layouts: PropTypes.object.isRequired,
  slug: PropTypes.string.isRequired,
  plugins: PropTypes.object,
};

export { EditView };
export default memo(EditView);

// function EditView({
//   currentEnvironment,
//   emitEvent,
//   layouts,
//   location: { pathname, search },
//   history: { push },

//   slug,
//   plugins,
// }) {
//   const { id } = useParams();
//   const abortController = new AbortController();
//   const { signal } = abortController;
//   const layout = get(layouts, [slug, 'contentType'], {});
//   const isCreatingEntry = id === 'create';
//   const attributes = get(layout, ['schema', 'attributes'], {});

//   const components = retrieveDisplayedComponents(attributes);
//   const componentLayoutsToGet = retrieveComponentsLayoutsToFetch(components);

//   // States
//   const [showWarningCancel, setWarningCancel] = useState(false);
//   const [showWarningDelete, setWarningDelete] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
//     init(initialState, layout, isCreatingEntry)
//   );

//   const state = reducerState.toJS();
//   const {
//     didCheckErrors,
//     errors,
//     componentLayoutsData,
//     initialData,
//     modifiedData,
//     isLoading,
//     isLoadingForLayouts,
//   } = state;

//   const source = getQueryParameters(search, 'source');
//   const shouldShowLoader =
//     isLoadingForLayouts || (!isCreatingEntry && isLoading);

//   useEffect(() => {
//     const fetchComponentLayouts = async () => {
//       try {
//         const data = await Promise.all(
//           componentLayoutsToGet.map(uid =>
//             request(`/${pluginId}/components/${uid}`, {
//               method: 'GET',
//               signal,
//             })
//           )
//         );

//         const componentLayouts = data.reduce((acc, current) => {
//           acc[current.data.uid] = current.data;

//           return acc;
//         }, {});

//         // Retrieve all the default values for the repeatables and init the form
//         const defaultComponentValues = getDefaultComponentValues(
//           components,
//           componentLayouts
//         );

//         dispatch({
//           type: 'GET_COMPONENT_LAYOUTS_SUCCEEDED',
//           componentLayouts,
//           defaultComponentValues,
//           isCreatingEntry,
//         });
//       } catch (err) {
//         // TODO ADD A TRAD

//         if (err.code !== 20) {
//           strapi.notification.error('notification.error');
//         }
//       }
//     };
//     const fetchData = async () => {
//       try {
//         const data = await request(getRequestUrl(`${slug}/${id}`), {
//           method: 'GET',
//           params: { source },
//           signal,
//         });

//         dispatch({
//           type: 'GET_DATA_SUCCEEDED',
//           data,
//           defaultForm: setDefaultForm(get(layout, ['schema', 'attributes'])),
//         });
//         fetchComponentLayouts();
//       } catch (err) {
//         if (err.code !== 20) {
//           strapi.notification.error(`${pluginId}.error.record.fetch`);
//         }
//       }
//     };

//     // Force state to be cleared when navigation from one entry to another
//     dispatch({ type: 'RESET_PROPS' });

//     if (!isCreatingEntry) {
//       fetchData();
//     } else {
//       dispatch({
//         type: 'INIT',
//         data: setDefaultForm(get(layout, ['schema', 'attributes'])),
//         defaultForm: setDefaultForm(get(layout, ['schema', 'attributes'])),
//       });
//       fetchComponentLayouts();
//     }

//     return () => {
//       abortController.abort();
//     };

//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [id, isCreatingEntry, slug, source, pathname]);

//   if (shouldShowLoader) {
//     return <LoadingIndicatorPage />;
//   }

//   const toggleWarningCancel = () => setWarningCancel(prevState => !prevState);
//   const toggleWarningDelete = () => setWarningDelete(prevState => !prevState);
//   const redirectURL = search
//     .split('redirectUrl=')
//     .filter((_, index) => index !== 0)
//     .join('');

//   const redirectToPreviousPage = () => push(redirectURL);
//   const handleConfirmDelete = async () => {
//     toggleWarningDelete();
//     setIsSubmitting(true);

//     try {
//       await request(getRequestUrl(`${slug}/${id}`), {
//         method: 'DELETE',
//         params: { source },
//       });

//       strapi.notification.success(`${pluginId}.success.record.delete`);
//       redirectToPreviousPage();
//     } catch (err) {
//       setIsSubmitting(false);
//       strapi.notification.error(`${pluginId}.error.record.delete`);
//     }
//   };

//   const displayedFieldNameInHeader = get(
//     layout,
//     ['settings', 'mainField'],
//     'id'
//   );
//   const pluginHeaderTitle = isCreatingEntry
//     ? { id: `${pluginId}.containers.Edit.pluginHeader.title.new` }
//     : templateObject({ mainField: displayedFieldNameInHeader }, initialData)
//         .mainField;
//   const displayedRelations = get(layout, ['layouts', 'editRelations'], []);
//   const hasRelations = displayedRelations.length > 0;
//   const fields = get(layout, ['layouts', 'edit'], []);

//   const checkFormErrors = async () => {
//     const schema = createYupSchema(layout, {
//       components: componentLayoutsData,
//     });
//     let errors = {};

//     try {
//       // Validate the form using yup
//       await schema.validate(modifiedData, { abortEarly: false });
//     } catch (err) {
//       errors = getYupInnerErrors(err);
//     }

//     dispatch({
//       type: 'SET_ERRORS',
//       errors,
//     });
//   };

//   const handleChange = ({ target: { name, value, type } }) => {
//     let inputValue = value;

//     // Empty string is not a valid date,
//     // Set the date to null when it's empty
//     if (type === 'date' && value === '') {
//       inputValue = null;
//     }

//     dispatch({
//       type: 'ON_CHANGE',
//       keys: name.split('.'),
//       value: inputValue,
//     });
//   };

//   const handleSubmit = async e => {
//     e.preventDefault();
//     const schema = createYupSchema(layout, {
//       components: componentLayoutsData,
//     });

//     try {
//       // Validate the form using yup
//       await schema.validate(modifiedData, { abortEarly: false });
//       // Set the loading state in the plugin header
//       setIsSubmitting(true);
//       emitEvent('willSaveEntry');
//       // Create an object containing all the paths of the media fields
//       const filesMap = getMediaAttributes(layout, componentLayoutsData);
//       // Create an object that maps the keys with the related files to upload
//       const filesToUpload = mapDataKeysToFilesToUpload(filesMap, modifiedData);

//       const cleanedData = cleanData(
//         cloneDeep(modifiedData),
//         layout,
//         componentLayoutsData
//       );

//       const formData = new FormData();

//       formData.append('data', JSON.stringify(cleanedData));

//       Object.keys(filesToUpload).forEach(key => {
//         const files = filesToUpload[key];

//         files.forEach(file => {
//           formData.append(`files.${key}`, file);
//         });
//       });

//       // Change the request helper default headers so we can pass a FormData
//       const headers = {};
//       const method = isCreatingEntry ? 'POST' : 'PUT';
//       const endPoint = isCreatingEntry ? slug : `${slug}/${id}`;

//       try {
//         // Time to actually send the data
//         await request(
//           getRequestUrl(endPoint),
//           {
//             method,
//             headers,
//             params: { source },
//             body: formData,
//             signal,
//           },
//           false,
//           false
//         );
//         emitEvent('didSaveEntry');
//         redirectToPreviousPage();
//       } catch (err) {
//         const error = get(
//           err,
//           ['response', 'payload', 'message', '0', 'messages', '0', 'id'],
//           'SERVER ERROR'
//         );

//         setIsSubmitting(false);
//         emitEvent('didNotSaveEntry', { error: err });
//         strapi.notification.error(error);
//       }
//     } catch (err) {
//       setIsSubmitting(false);
//       const errors = get(err, 'inner', []).reduce((acc, curr) => {
//         acc[
//           curr.path
//             .split('[')
//             .join('.')
//             .split(']')
//             .join('')
//         ] = [{ id: curr.message }];

//         return acc;
//       }, {});

//       dispatch({
//         type: 'SET_ERRORS',
//         errors,
//       });

//       strapi.notification.error(
//         `${pluginId}.containers.EditView.notification.errors`
//       );
//     }
//   };

//   // return null;

//   return (
//     <EditViewProvider
//       addRelation={({ target: { name, value } }) => {
//         dispatch({
//           type: 'ADD_RELATION',
//           keys: name.split('.'),
//           value,
//         });
//       }}
//       checkFormErrors={checkFormErrors}
//       didCheckErrors={didCheckErrors}
//       errors={errors}
//       moveRelation={(dragIndex, overIndex, name) => {
//         dispatch({
//           type: 'MOVE_FIELD',
//           dragIndex,
//           overIndex,
//           keys: name.split('.'),
//         });
//       }}
//       onChange={handleChange}
//       onRemove={keys => {
//         dispatch({
//           type: 'REMOVE_RELATION',
//           keys,
//         });
//       }}
//       pathname={pathname}
//       resetErrors={() => {
//         dispatch({
//           type: 'SET_ERRORS',
//           errors: {},
//         });
//       }}
//       resetComponentData={componentName => {
//         dispatch({
//           type: 'RESET_COMPONENT_DATA',
//           componentName,
//         });
//       }}
//       search={search}
//     >
//       <BackHeader onClick={() => redirectToPreviousPage()} />
//       <Container className="container-fluid">
//         <form onSubmit={handleSubmit}>
//           <PluginHeader
//             actions={[
//               {
//                 label: `${pluginId}.containers.Edit.reset`,
//                 kind: 'secondary',
//                 onClick: () => {
//                   toggleWarningCancel();
//                 },
//                 type: 'button',
//                 disabled: isSubmitting, // TODO STATE WHEN SUBMITING
//               },
//               {
//                 kind: 'primary',
//                 label: `${pluginId}.containers.Edit.submit`,
//                 type: 'submit',
//                 loader: isSubmitting,
//                 style: isSubmitting ? { marginRight: '18px' } : {},
//                 disabled: isSubmitting, // TODO STATE WHEN SUBMITING
//               },
//             ]}
//             subActions={
//               isCreatingEntry
//                 ? []
//                 : [
//                     {
//                       label: 'app.utils.delete',
//                       kind: 'delete',
//                       onClick: () => {
//                         toggleWarningDelete();
//                       },
//                       type: 'button',
//                       disabled: isSubmitting, // TODO STATE WHEN SUBMITING
//                     },
//                   ]
//             }
//             title={pluginHeaderTitle}
//           />
//           <div className="row">
//             <div className="col-md-12 col-lg-9">
//               <MainWrapper>
//                 {fields.map((fieldsRow, key) => {
//                   if (fieldsRow.length === 0) {
//                     return null;
//                   }

//                   const [{ name }] = fieldsRow;
//                   const component = get(
//                     layout,
//                     ['schema', 'attributes', name],
//                     {}
//                   );
//                   const componentMetas = get(
//                     layout,
//                     ['metadatas', name, 'edit'],
//                     {}
//                   );
//                   const componentValue = get(
//                     modifiedData,
//                     [name],
//                     component.repeatable ? [] : {}
//                   );

//                   if (
//                     fieldsRow.length === 1 &&
//                     component.type === 'component'
//                   ) {
//                     // Array containing all the keys with of the error object created by YUP
//                     // It is used only to know if whether or not we need to apply an orange border to the n+1 field item
//                     const componentErrorKeys = Object.keys(errors)
//                       .filter(errorKey => errorKey.includes(name))
//                       .map(errorKey =>
//                         errorKey
//                           .split('.')
//                           .slice(0, 2)
//                           .join('.')
//                       );

//                     return (
//                       <ComponentField
//                         {...component}
//                         {...componentMetas}
//                         addField={(keys, isRepeatable = true) => {
//                           dispatch({
//                             type: 'ADD_FIELD_TO_COMPONENT',
//                             keys: keys.split('.'),
//                             isRepeatable,
//                           });
//                         }}
//                         componentErrorKeys={componentErrorKeys}
//                         componentValue={componentValue}
//                         key={key}
//                         isRepeatable={component.repeatable || false}
//                         name={name}
//                         modifiedData={modifiedData}
//                         moveComponentField={(dragIndex, overIndex, name) => {
//                           dispatch({
//                             type: 'MOVE_FIELD',
//                             dragIndex,
//                             overIndex,
//                             keys: name.split('.'),
//                           });
//                         }}
//                         onChange={handleChange}
//                         layout={get(
//                           componentLayoutsData,
//                           component.component,
//                           {}
//                         )}
//                         pathname={pathname}
//                         removeField={(keys, shouldAddEmptyField) => {
//                           dispatch({
//                             type: 'ON_REMOVE_FIELD',
//                             keys: keys.split('.'),
//                             shouldAddEmptyField,
//                           });
//                         }}
//                       />
//                     );
//                   }

//                   return (
//                     <div key={key} className="row">
//                       {fieldsRow.map(({ name }, index) => {
//                         return (
//                           <Inputs
//                             autoFocus={key === 0 && index === 0}
//                             didCheckErrors={didCheckErrors}
//                             errors={errors}
//                             key={name}
//                             keys={name}
//                             layout={layout}
//                             modifiedData={modifiedData}
//                             name={name}
//                             onChange={handleChange}
//                           />
//                         );
//                       })}
//                     </div>
//                   );
//                 })}
//               </MainWrapper>
//             </div>
//             <div className="col-md-12 col-lg-3">
//               {hasRelations && (
//                 <SubWrapper
//                   style={{ padding: '0 20px 1px', marginBottom: '26px' }}
//                 >
//                   <div style={{ paddingTop: '22px' }}>
//                     {displayedRelations.map(relationName => {
//                       const relation = get(
//                         layout,
//                         ['schema', 'attributes', relationName],
//                         {}
//                       );
//                       const relationMetas = get(
//                         layout,
//                         ['metadatas', relationName, 'edit'],
//                         {}
//                       );
//                       const value = get(modifiedData, [relationName], null);

//                       return (
//                         <SelectWrapper
//                           {...relation}
//                           {...relationMetas}
//                           key={relationName}
//                           name={relationName}
//                           relationsType={relation.relationType}
//                           value={value}
//                         />
//                       );
//                     })}
//                   </div>
//                 </SubWrapper>
//               )}
//               <LinkWrapper>
//                 <ul>
//                   <LiLink
//                     message={{
//                       id: 'app.links.configure-view',
//                     }}
//                     icon="layout"
//                     key={`${pluginId}.link`}
//                     // url={`/plugins/${pluginId}/ctm-configurations/edit-settings/content-types/${slug}${`?source=${source}`}`}
//                     url={`ctm-configurations/edit-settings/content-types${`?source=${source}`}`}
//                     onClick={() => {
//                       emitEvent('willEditContentTypeLayoutFromEditView');
//                     }}
//                   />
//                   {getInjectedComponents(
//                     'right.links',
//                     plugins,
//                     currentEnvironment,
//                     slug,
//                     source,
//                     emitEvent
//                   )}
//                 </ul>
//               </LinkWrapper>
//             </div>
//           </div>
//         </form>
//         <PopUpWarning
//           isOpen={showWarningCancel}
//           toggleModal={toggleWarningCancel}
//           content={{
//             title: `${pluginId}.popUpWarning.title`,
//             message: `${pluginId}.popUpWarning.warning.cancelAllSettings`,
//             cancel: `${pluginId}.popUpWarning.button.cancel`,
//             confirm: `${pluginId}.popUpWarning.button.confirm`,
//           }}
//           popUpWarningType="danger"
//           onConfirm={() => {
//             dispatch({
//               type: 'RESET_FORM',
//             });
//             toggleWarningCancel();
//           }}
//         />
//         <PopUpWarning
//           isOpen={showWarningDelete}
//           toggleModal={toggleWarningDelete}
//           content={{
//             title: `${pluginId}.popUpWarning.title`,
//             message: `${pluginId}.popUpWarning.bodyMessage.contentType.delete`,
//             cancel: `${pluginId}.popUpWarning.button.cancel`,
//             confirm: `${pluginId}.popUpWarning.button.confirm`,
//           }}
//           popUpWarningType="danger"
//           onConfirm={handleConfirmDelete}
//         />
//       </Container>
//     </EditViewProvider>
//   );
// }

// EditView.propTypes = {
//   currentEnvironment: PropTypes.string.isRequired,
//   emitEvent: PropTypes.func.isRequired,
//   history: PropTypes.shape({
//     push: PropTypes.func.isRequired,
//   }),
//   layouts: PropTypes.object,
//   location: PropTypes.shape({
//     pathname: PropTypes.string,
//     search: PropTypes.string,
//   }),
//   slug: PropTypes.string.isRequired,
//   plugins: PropTypes.object,
// };

// export default memo(EditView);
