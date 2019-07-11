import React, { memo, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import {
  getQueryParameters,
  LoadingIndicatorPage,
  PluginHeader,
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
  match: {
    params: { slug, id },
  },
}) {
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState)
  );
  const layout = get(layouts, [slug], {});
  const displayedFieldNameInHeader = get(
    layout,
    ['settings', 'mainField'],
    'id'
  );
  const state = reducerState.toJS();
  const { initialData, isLoading, isSubmitting } = state;
  const isCreatingEntry = id === 'create';
  const source = getQueryParameters(search, 'source');
  const shouldShowLoader = !isCreatingEntry && isLoading;

  useEffect(() => {
    const fetchData = async () => {
      const data = await request(getRequestUrl(`${slug}/${id}`), {
        method: 'GET',
        params: { source },
      });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    };

    if (!isCreatingEntry) {
      fetchData();
    }
  }, [id, isCreatingEntry, slug, source]);

  if (shouldShowLoader) {
    return <LoadingIndicatorPage />;
  }

  const handleSubmit = e => {
    e.preventDefault();
  };

  const pluginHeaderTitle = isCreatingEntry
    ? { id: `${pluginId}.containers.Edit.pluginHeader.title.new` }
    : templateObject({ mainField: displayedFieldNameInHeader }, initialData)
        .mainField;

  return (
    <Container className="container-fluid">
      <form onSubmit={handleSubmit}>
        <PluginHeader
          actions={[
            {
              label: `${pluginId}.containers.Edit.reset`,
              kind: 'secondary',
              onClick: () => {},
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
                    onClick: () => {},
                    type: 'button',
                    disabled: isSubmitting, // TODO STATE WHEN SUBMITING
                  },
                ]
          }
          title={pluginHeaderTitle}
        />
      </form>
    </Container>
  );
}

EditView.propTypes = {
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
