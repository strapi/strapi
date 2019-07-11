import React, { memo, useEffect, useState, useReducer } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import {
  BackHeader,
  getQueryParameters,
  LoadingIndicatorPage,
  PluginHeader,
  PopUpWarning,
  request,
  templateObject,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';

import Container from '../../components/Container';

import init from './init';
import reducer, { initialState } from './reducer';

const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

function EditView({
  layouts,
  location: { search },
  history: { push },
  match: {
    params: { slug, id },
  },
}) {
  const [showWarningCancel, setWarningCancel] = useState(false);
  const [showWarningDelete, setWarningDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState)
  );

  const layout = get(layouts, [slug], {});
  const isCreatingEntry = id === 'create';
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

  const state = reducerState.toJS();
  const { initialData, isLoading } = state;

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
  console.log(redirectURL);
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
};

export default memo(EditView);
