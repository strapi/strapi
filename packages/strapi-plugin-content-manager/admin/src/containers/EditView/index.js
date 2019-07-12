import React, { memo, useEffect, useState, useReducer } from 'react';
import PropTypes from 'prop-types';
import { get, omit } from 'lodash';

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
import Inputs from './Inputs';

import init from './init';
import reducer, { initialState } from './reducer';

const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

function EditView({
  currentEnvironment,
  emitEvent,
  layouts,
  location: { search },
  history: { push },
  match: {
    params: { slug, id },
  },
  plugins,
}) {
  const layout = get(layouts, [slug], {});
  const isCreatingEntry = id === 'create';

  const [showWarningCancel, setWarningCancel] = useState(false);
  const [showWarningDelete, setWarningDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, layout, isCreatingEntry)
  );
  const state = reducerState.toJS();
  const { initialData, modifiedData, isLoading } = state;

  const source = getQueryParameters(search, 'source');
  const shouldShowLoader = !isCreatingEntry && isLoading;

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

    if (!isCreatingEntry) {
      fetchData();
    }
  }, [id, isCreatingEntry, slug, source]);

  if (shouldShowLoader) {
    return <LoadingIndicatorPage />;
  }

  const toggleWarningCancel = () => setWarningCancel(prevState => !prevState);
  const toggleWarningDelete = () => setWarningDelete(prevState => !prevState);
  const redirectURL = search.split('redirectUrl=')[1];
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
  const hasRelations = get(layout, ['layouts', 'editRelations'], []).length > 0;
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
            <div className="col-md-12 col-lg-9">
              <MainWrapper>
                {fields.map((fieldsRow, key) => {
                  //

                  return (
                    <div key={key} className="row">
                      {fieldsRow.map(({ name }) => {
                        const attribute = get(
                          layout,
                          ['schema', 'attributes', name],
                          {}
                        );
                        const { model, collection } = attribute;
                        const isMedia =
                          get(attribute, 'plugin', '') === 'upload' &&
                          (model || collection) === 'file';
                        const multiple = collection == 'file';
                        const metadata = get(
                          layout,
                          ['metadata', name, 'edit'],
                          {}
                        );
                        const type = isMedia
                          ? 'file'
                          : get(attribute, 'type', null);
                        const inputStyle =
                          type === 'text' ? { height: '196px' } : {};
                        const validations = omit(attribute, [
                          'type',
                          'model',
                          'via',
                          'collection',
                          'default',
                          'plugin',
                          'enum',
                        ]);
                        const value = get(modifiedData, name);

                        if (type === 'group') {
                          return null;
                        }

                        return (
                          <Inputs
                            {...metadata}
                            inputStyle={inputStyle}
                            key={name}
                            multiple={multiple}
                            name={name}
                            onChange={() => {}}
                            selectOptions={get(attribute, 'enum', [])}
                            type={type}
                            validations={validations}
                            value={value}
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
                  <div style={{ paddingTop: '19px' }}>Relations</div>
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
