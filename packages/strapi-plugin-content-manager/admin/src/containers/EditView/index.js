import React, { memo, useEffect, useState, useReducer } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

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

import Container from '../../components/Container';

import { LinkWrapper, MainWrapper, SubWrapper } from './components';
import Group from './Group';
import Inputs from './Inputs';

import init, { setDefaultForm } from './init';
import reducer, { initialState } from './reducer';
import SelectWrapper from '../../components/SelectWrapper';

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
    groupLayoutsData,
    initialData,
    modifiedData,
    isLoading,
    isLoadingForLayouts,
  } = state;

  const source = getQueryParameters(search, 'source');
  const shouldShowLoader =
    isLoadingForLayouts || (!isCreatingEntry && isLoading);
  ``;

  // Keep these lines if we make the Group component collapsable
  // useEffect(() => {
  //   dispatch({
  //     type: 'SET_COLLAPSES_COMPONENTS_STATE',
  //     collapses: groups.reduce((acc, current) => {
  //       const { key, isOpen, repeatable } = current;
  //       acc[key] = { isOpen, repeatable };

  //       return acc;
  //     }, {}),
  //   });
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await request(getRequestUrl(`${slug}/${id}`), {
          method: 'GET',
          params: { source },
        });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      } catch (err) {
        strapi.notification.error(`${pluginId}.error.record.fetch`);
      }
    };

    const fetchGroupLayouts = async () => {
      try {
        const data = await Promise.all(
          groupLayoutsToGet.map(uid =>
            request(`/${pluginId}/fixtures/layouts/${uid}`, { method: 'GET' })
          )
        );

        const groupLayouts = data.reduce((acc, current) => {
          acc[current.layout.uid] = current.layout;

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
        console.log({ err });
        // TODO ADD A TRAD
        strapi.notification.error('notification.error');
      }
    };

    fetchGroupLayouts();

    if (!isCreatingEntry) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isCreatingEntry, slug, source]);

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
  const handleSubmit = e => {
    e.preventDefault();
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

  return (
    <>
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
            <div className="coel-md-12 col-lg-9">
              <MainWrapper>
                {fields.map((fieldsRow, key) => {
                  //
                  const [{ name }] = fieldsRow;
                  const group = get(layout, ['schema', 'attributes', name], {});
                  const groupMeta = get(layout, ['metadata', name, 'edit'], {});
                  const groupValue = get(
                    modifiedData,
                    [name],
                    group.repeatable ? [] : {}
                  );

                  if (fieldsRow.length === 1 && group.type === 'group') {
                    return (
                      <Group
                        {...group}
                        {...groupMeta}
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
                          console.log(name);
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
                  style={{ padding: '0 20px 1px', marginBottom: '28px' }}
                >
                  <div style={{ paddingTop: '19px' }}>
                    {displayedRelations.map(relationName => {
                      //
                      const relation = get(
                        layout,
                        ['schema', 'attributes', relationName],
                        {}
                      );
                      const relationMetas = get(
                        layout,
                        ['metadata', relationName, 'edit'],
                        {}
                      );
                      const value = get(modifiedData, [relationName], null);

                      return (
                        <SelectWrapper
                          {...relation}
                          {...relationMetas}
                          key={relationName}
                          addRelation={({ target: { name, value } }) => {
                            dispatch({
                              type: 'ADD_RELATION',
                              keys: name.split('.'),
                              value,
                            });
                          }}
                          moveRelation={(dragIndex, overIndex, name) => {
                            dispatch({
                              type: 'MOVE_FIELD',
                              dragIndex,
                              overIndex,
                              keys: name.split('.'),
                            });
                          }}
                          name={relationName}
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
                          relationType={relation.relationType}
                          search={search}
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
    </>
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
