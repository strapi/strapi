import React, { memo, useEffect, useState, useReducer } from 'react';
import PropTypes from 'prop-types';
import { cloneDeep, get, isEmpty } from 'lodash';
import {
  BackHeader,
  getQueryParameters,
  LoadingIndicatorPage,
  LiLink,
  PluginHeader,
  PopUpWarning,
  request,
  templateObject,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import { EditViewProvider } from '../../contexts/EditView';
import Container from '../../components/Container';
import Group from '../../components/Group';
import Inputs from '../../components/Inputs';
import SelectWrapper from '../../components/SelectWrapper';
import init, { setDefaultForm } from './init';
import reducer, { initialState } from './reducer';
import { LinkWrapper, MainWrapper, SubWrapper } from './components';
import createYupSchema from './utils/schema';
import {
  getMediaAttributes,
  cleanData,
  associateFilesToData,
} from './utils/formatData';

const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

function EditView({
  currentEnvironment,
  emitEvent,
  layouts,
  location: { pathname, search },
  history: { push },
  match: {
    params: { slug, id },
  },
  plugins,
}) {
  const layout = get(layouts, [slug], {});
  const isCreatingEntry = id === 'create';
  const attributes = get(layout, ['schema', 'attributes'], {});
  const submitAbortController = new AbortController();
  const submitSignal = submitAbortController.signal;
  const groups = Object.keys(attributes).reduce((acc, current) => {
    const { group, repeatable, type, min } = get(attributes, [current], {
      group: '',
      type: '',
      repeatable,
    });

    if (type === 'group') {
      acc.push({ key: current, group, repeatable, isOpen: !repeatable, min });
    }

    return acc;
  }, []);
  const groupLayoutsToGet = groups
    .filter(
      (current, index) =>
        groups.findIndex(el => el.group === current.group) === index
    )
    .map(({ group }) => group);

  const [showWarningCancel, setWarningCancel] = useState(false);
  const [showWarningDelete, setWarningDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, layout, isCreatingEntry)
  );

  const state = reducerState.toJS();
  const {
    didCheckErrors,
    errors,
    groupLayoutsData,
    initialData,
    modifiedData,
    isLoading,
    isLoadingForLayouts,
  } = state;

  const source = getQueryParameters(search, 'source');
  const shouldShowLoader =
    isLoadingForLayouts || (!isCreatingEntry && isLoading);

  useEffect(() => {
    // Cancel requests
    const abortControllerFetchData = new AbortController();
    const abortControllerLayouts = new AbortController();
    const signalFetchData = abortControllerFetchData.signal;
    const signalFetchLayouts = abortControllerLayouts.signal;

    const fetchGroupLayouts = async () => {
      try {
        const data = await Promise.all(
          groupLayoutsToGet.map(uid =>
            request(`/${pluginId}/groups/${uid}`, {
              method: 'GET',
              signal: signalFetchLayouts,
            })
          )
        );

        const groupLayouts = data.reduce((acc, current) => {
          acc[current.data.uid] = current.data;

          return acc;
        }, {});
        // Retrieve all the default values for the repeatables and init the form
        const defaultGroupValues = groups.reduce((acc, current) => {
          const defaultForm = setDefaultForm(
            get(groupLayouts, [current.group, 'schema', 'attributes'], {})
          );
          const arr = [];

          if (current.min && current.repeatable === true) {
            for (let i = 0; i < current.min; i++) {
              arr.push({ ...defaultForm, _temp__id: i });
            }
          }

          acc[current.key] = {
            toSet: arr,
            defaultRepeatable: defaultForm,
          };

          if (current.repeatable === false) {
            acc[current.key] = {
              toSet: defaultForm,
              defaultRepeatable: defaultForm,
            };
          }

          return acc;
        }, {});

        dispatch({
          type: 'GET_GROUP_LAYOUTS_SUCCEEDED',
          groupLayouts,
          defaultGroupValues,
          isCreatingEntry,
        });
      } catch (err) {
        // TODO ADD A TRAD

        if (err.code !== 20) {
          strapi.notification.error('notification.error');
        }
      }
    };
    const fetchData = async () => {
      try {
        const data = await request(getRequestUrl(`${slug}/${id}`), {
          method: 'GET',
          params: { source },
          signal: signalFetchData,
        });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
        fetchGroupLayouts();
      } catch (err) {
        if (err.code !== 20) {
          strapi.notification.error(`${pluginId}.error.record.fetch`);
        }
      }
    };

    if (!isCreatingEntry) {
      fetchData();
    } else {
      dispatch({
        type: 'INIT',
        data: setDefaultForm(get(layout, ['schema', 'attributes'])),
      });
      fetchGroupLayouts();
    }

    return () => {
      abortControllerFetchData.abort();
      abortControllerLayouts.abort();
      submitAbortController.abort();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isCreatingEntry, slug, source, pathname]);

  if (shouldShowLoader) {
    return <LoadingIndicatorPage />;
  }

  const toggleWarningCancel = () => setWarningCancel(prevState => !prevState);
  const toggleWarningDelete = () => setWarningDelete(prevState => !prevState);
  const redirectURL = search
    .split('redirectUrl=')
    .filter((_, index) => index !== 0)
    .join('');

  const redirectToPreviousPage = () => push(redirectURL);
  const handleConfirmDelete = async () => {
    toggleWarningDelete();
    setIsSubmitting(true);

    try {
      await request(getRequestUrl(`${slug}/${id}`), {
        method: 'DELETE',
        params: { source },
      });

      strapi.notification.success(`${pluginId}.success.record.delete`);
      redirectToPreviousPage();
    } catch (err) {
      setIsSubmitting(false);
      strapi.notification.error(`${pluginId}.error.record.delete`);
    }
  };

  const displayedFieldNameInHeader = get(
    layout,
    ['settings', 'mainField'],
    'id'
  );
  const pluginHeaderTitle = isCreatingEntry
    ? { id: `${pluginId}.containers.Edit.pluginHeader.title.new` }
    : templateObject({ mainField: displayedFieldNameInHeader }, initialData)
        .mainField;
  const displayedRelations = get(layout, ['layouts', 'editRelations'], []);
  const hasRelations = displayedRelations.length > 0;
  const fields = get(layout, ['layouts', 'edit'], []);
  /**
   * Retrieve external links from injected components
   * @type {Array} List of external links to display
   */
  const retrieveLinksContainerComponent = () => {
    const componentToInject = Object.keys(plugins).reduce((acc, current) => {
      // Retrieve injected compos from plugin
      // if compo can be injected in left.links area push the compo in the array
      const currentPlugin = plugins[current];
      const injectedComponents = get(currentPlugin, 'injectedComponents', []);

      const compos = injectedComponents
        .filter(compo => {
          return (
            compo.plugin === `${pluginId}.editPage` &&
            compo.area === 'right.links'
          );
        })
        .map(compo => {
          const Component = compo.component;

          return (
            <Component
              currentEnvironment={currentEnvironment}
              getModelName={() => slug}
              getSource={() => source}
              getContentTypeBuilderBaseUrl={() =>
                '/plugins/content-type-builder/models/'
              }
              {...compo.props}
              key={compo.key}
              onClick={() => {
                emitEvent('willEditContentTypeFromEditView');
              }}
            />
          );
        });

      return [...acc, ...compos];
    }, []);

    return componentToInject;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const schema = createYupSchema(layout, { groups: groupLayoutsData });

    try {
      await schema.validate(modifiedData, { abortEarly: false });
      setIsSubmitting(true);
      const filesMap = getMediaAttributes(layout, groupLayoutsData);
      const formDatas = Object.keys(filesMap).reduce((acc, current) => {
        const keys = current.split('.');
        const isMultiple = get(filesMap, [current, 'multiple'], false);
        const isGroup = get(filesMap, [current, 'isGroup'], false);
        const isRepeatable = get(filesMap, [current, 'repeatable'], false);

        const getFilesToUpload = path => {
          const value = get(modifiedData, path, []) || [];

          return value.filter(file => {
            return file instanceof File;
          });
        };
        const getFileToUpload = path => {
          const file = get(modifiedData, [...path, 0], '');
          if (file instanceof File) {
            return [file];
          }

          return [];
        };

        if (!isRepeatable) {
          const currentFilesToUpload = isMultiple
            ? getFilesToUpload(keys)
            : getFileToUpload([...keys]);

          if (!isEmpty(currentFilesToUpload)) {
            acc[current] = currentFilesToUpload.reduce((acc2, curr) => {
              acc2.append('files', curr);

              return acc2;
            }, new FormData());
          }
        }

        if (isGroup && isRepeatable) {
          const [key, targetKey] = current.split('.');
          const groupData = get(modifiedData, [key], []);
          const groupFiles = groupData.reduce((acc1, current, index) => {
            const files = isMultiple
              ? getFileToUpload([key, index, targetKey])
              : getFileToUpload([key, index, targetKey]);

            if (!isEmpty(files)) {
              const toFormData = files.reduce((acc2, curr) => {
                acc2.append('files', curr);

                return acc2;
              }, new FormData());

              acc1[`${key}.${index}.${targetKey}`] = toFormData;
            }

            return acc1;
          }, {});

          return { ...acc, ...groupFiles };
        }

        return acc;
      }, {});
      // Change the request helper default headers so we can pass a FormData
      const headers = { 'X-Forwarded-Host': 'strapi' };
      const mapUploadedFiles = Object.keys(formDatas).reduce(
        async (acc, current) => {
          const collection = await acc;
          try {
            const uploadedFiles = await request(
              '/upload',
              {
                method: 'POST',
                body: formDatas[current],
                headers,
                signal: submitSignal,
              },
              false,
              false
            );

            collection[current] = uploadedFiles;

            return collection;
          } catch (err) {
            strapi.notification.error('upload error');
          }
        },
        Promise.resolve({})
      );

      const cleanedData = cleanData(
        cloneDeep(modifiedData),
        layout,
        groupLayoutsData
      );
      const cleanedDataWithUploadedFiles = associateFilesToData(
        cleanedData,
        filesMap,
        await mapUploadedFiles
      );

      const method = isCreatingEntry ? 'POST' : 'PUT';
      const endPoint = isCreatingEntry ? slug : `${slug}/${id}`;

      // Time to actually send the data
      await request(getRequestUrl(endPoint), {
        method,
        params: { source },
        body: cleanedDataWithUploadedFiles,
        signal: submitSignal,
      });
      redirectToPreviousPage();
    } catch (err) {
      setIsSubmitting(false);
      console.log({ err });
      const errors = get(err, 'inner', []).reduce((acc, curr) => {
        acc[
          curr.path
            .split('[')
            .join('.')
            .split(']')
            .join('')
        ] = [{ id: curr.message }];

        return acc;
      }, {});
      dispatch({
        type: 'SET_ERRORS',
        errors,
      });

      strapi.notification.error(
        `${pluginId}.containers.EditView.notification.errors`
      );
    }
  };

  return (
    <EditViewProvider
      addRelation={({ target: { name, value } }) => {
        dispatch({
          type: 'ADD_RELATION',
          keys: name.split('.'),
          value,
        });
      }}
      didCheckErrors={didCheckErrors}
      errors={errors}
      moveRelation={(dragIndex, overIndex, name) => {
        dispatch({
          type: 'MOVE_FIELD',
          dragIndex,
          overIndex,
          keys: name.split('.'),
        });
      }}
      onChange={({ target: { name, value } }) => {
        dispatch({
          type: 'ON_CHANGE',
          keys: name.split('.'),
          value,
        });
      }}
      onRemove={keys => {
        dispatch({
          type: 'REMOVE_RELATION',
          keys,
        });
      }}
      pathname={pathname}
      search={search}
    >
      <BackHeader onClick={() => redirectToPreviousPage()} />
      <Container className="container-fluid">
        <form onSubmit={handleSubmit}>
          <PluginHeader
            actions={[
              {
                label: `${pluginId}.containers.Edit.reset`,
                kind: 'secondary',
                onClick: () => {
                  toggleWarningCancel();
                },
                type: 'button',
                disabled: isSubmitting, // TODO STATE WHEN SUBMITING
              },
              {
                kind: 'primary',
                label: `${pluginId}.containers.Edit.submit`,
                type: 'submit',
                loader: isSubmitting,
                style: isSubmitting
                  ? { marginRight: '18px', flexGrow: 2 }
                  : { flexGrow: 2 },
                disabled: isSubmitting, // TODO STATE WHEN SUBMITING
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
                        toggleWarningDelete();
                      },
                      type: 'button',
                      disabled: isSubmitting, // TODO STATE WHEN SUBMITING
                    },
                  ]
            }
            title={pluginHeaderTitle}
          />
          <div className="row">
            <div className="col-md-12 col-lg-9">
              <MainWrapper>
                {fields.map((fieldsRow, key) => {
                  const [{ name }] = fieldsRow;
                  const group = get(layout, ['schema', 'attributes', name], {});
                  const groupMetas = get(
                    layout,
                    ['metadatas', name, 'edit'],
                    {}
                  );
                  const groupValue = get(
                    modifiedData,
                    [name],
                    group.repeatable ? [] : {}
                  );

                  if (fieldsRow.length === 1 && group.type === 'group') {
                    return (
                      <Group
                        {...group}
                        {...groupMetas}
                        addField={keys => {
                          dispatch({
                            type: 'ADD_FIELD_TO_GROUP',
                            keys: keys.split('.'),
                          });
                        }}
                        groupValue={groupValue}
                        key={key}
                        isRepeatable={group.repeatable}
                        name={name}
                        modifiedData={modifiedData}
                        moveGroupField={(dragIndex, overIndex, name) => {
                          dispatch({
                            type: 'MOVE_FIELD',
                            dragIndex,
                            overIndex,
                            keys: name.split('.'),
                          });
                        }}
                        onChange={({ target: { name, value } }) => {
                          dispatch({
                            type: 'ON_CHANGE',
                            keys: name.split('.'),
                            value,
                          });
                        }}
                        layout={get(groupLayoutsData, group.group, {})}
                        pathname={pathname}
                        removeField={(keys, shouldAddEmptyField) => {
                          dispatch({
                            type: 'ON_REMOVE_FIELD',
                            keys: keys.split('.'),
                            shouldAddEmptyField,
                          });
                        }}
                      />
                    );
                  }

                  return (
                    <div key={key} className="row">
                      {fieldsRow.map(({ name }, index) => {
                        return (
                          <Inputs
                            autoFocus={key === 0 && index === 0}
                            didCheckErrors={didCheckErrors}
                            errors={errors}
                            key={name}
                            keys={name}
                            layout={layout}
                            modifiedData={modifiedData}
                            name={name}
                            onChange={({ target: { name, value } }) => {
                              dispatch({
                                type: 'ON_CHANGE',
                                keys: name.split('.'),
                                value,
                              });
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </MainWrapper>
            </div>
            <div className="col-md-12 col-lg-3">
              {hasRelations && (
                <SubWrapper
                  style={{ padding: '0 20px 1px', marginBottom: '26px' }}
                >
                  <div style={{ paddingTop: '22px' }}>
                    {displayedRelations.map(relationName => {
                      const relation = get(
                        layout,
                        ['schema', 'attributes', relationName],
                        {}
                      );
                      const relationMetas = get(
                        layout,
                        ['metadatas', relationName, 'edit'],
                        {}
                      );
                      const value = get(modifiedData, [relationName], null);

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
                      id: `${pluginId}.containers.Edit.Link.Layout`,
                    }}
                    icon="layout"
                    key={`${pluginId}.link`}
                    url={`/plugins/${pluginId}/ctm-configurations/models/${slug}/edit-settings`}
                    onClick={() => {
                      emitEvent('willEditContentTypeLayoutFromEditView');
                    }}
                  />
                  {retrieveLinksContainerComponent()}
                </ul>
              </LinkWrapper>
            </div>
          </div>
        </form>
        <PopUpWarning
          isOpen={showWarningCancel}
          toggleModal={toggleWarningCancel}
          content={{
            title: `${pluginId}.popUpWarning.title`,
            message: `${pluginId}.popUpWarning.warning.cancelAllSettings`,
            cancel: `${pluginId}.popUpWarning.button.cancel`,
            confirm: `${pluginId}.popUpWarning.button.confirm`,
          }}
          popUpWarningType="danger"
          onConfirm={() => {
            dispatch({
              type: 'RESET_FORM',
            });
            toggleWarningCancel();
          }}
        />
        <PopUpWarning
          isOpen={showWarningDelete}
          toggleModal={toggleWarningDelete}
          content={{
            title: `${pluginId}.popUpWarning.title`,
            message: `${pluginId}.popUpWarning.bodyMessage.contentType.delete`,
            cancel: `${pluginId}.popUpWarning.button.cancel`,
            confirm: `${pluginId}.popUpWarning.button.confirm`,
          }}
          popUpWarningType="danger"
          onConfirm={handleConfirmDelete}
        />
      </Container>
    </EditViewProvider>
  );
}

EditView.propTypes = {
  currentEnvironment: PropTypes.string.isRequired,
  emitEvent: PropTypes.func.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }),
  layouts: PropTypes.object,
  location: PropTypes.shape({
    pathname: PropTypes.string,
    search: PropTypes.string,
  }),
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
    }),
  }),
  plugins: PropTypes.object,
};

export default memo(EditView);
