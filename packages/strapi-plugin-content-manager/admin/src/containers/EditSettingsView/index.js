import React, { useEffect, useMemo, useReducer } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import {
  // utils
  getQueryParameters,
  request,
  // contexts
  // useGlobalContext,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import getRequestUrl from '../../utils/getRequestUrl';
import SettingsViewWrapper from '../../components/SettingsViewWrapper';

import reducer, { initialState } from './reducer';

const EditSettingsView = ({
  // deleteLayout,
  location: { search },
  match: {
    params: { slug },
  },
}) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const source = getQueryParameters(search, 'source');
  const abortController = new AbortController();
  const { signal } = abortController;
  const params = source === 'content-manager' ? {} : { source };
  const { isLoading, initialData, modifiedData } = reducerState.toJS();

  const getAttributes = useMemo(() => {
    return get(modifiedData, ['schema', 'attributes'], {});
  }, [modifiedData]);

  console.log(getAttributes);

  useEffect(() => {
    const getData = async () => {
      try {
        const { data } = await request(getRequestUrl(`content-types/${slug}`), {
          method: 'GET',
          params,
          signal,
        });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
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
  }, [slug, source]);

  const handleConfirm = async () => {};

  return (
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
      onChange={({ target: { name, value } }) => {
        dispatch({
          type: 'ON_CHANGE',
          keys: name.split('.'),
          value,
        });
      }}
      onConfirmReset={() => {
        dispatch({
          type: 'ON_RESET',
        });
      }}
      onConfirmSubmit={handleConfirm}
      slug={slug}
      isEditSettings
    >
      coucou
    </SettingsViewWrapper>
  );
};

EditSettingsView.propTypes = {
  deleteLayout: PropTypes.func.isRequired,
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }).isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default EditSettingsView;
