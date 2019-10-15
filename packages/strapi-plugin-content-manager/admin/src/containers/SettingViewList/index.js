import React, { useEffect, useReducer, useState } from 'react';
import PropTypes from 'prop-types';
import { cloneDeep, get, isEqual, upperFirst } from 'lodash';
import {
  PopUpWarning,
  getQueryParameters,
  request,
  useGlobalContext,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import getRequestUrl from '../../utils/getRequestUrl';
import DraggedField from '../../components/DraggedField';
import SettingsViewWrapper from '../../components/SettingsViewWrapper';
import SortWrapper from '../../components/SortWrapper';
import reducer, { initialState } from './reducer';
import forms from './forms.json';

const SettingViewList = ({
  location: { search },
  match: {
    params: { slug },
  },
}) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const [showWarningCancel, setWarningCancel] = useState(false);
  const [showWarningSubmit, setWarningSubmit] = useState(false);
  const { emitEvent } = useGlobalContext();

  const toggleWarningCancel = () => setWarningCancel(prevState => !prevState);
  const toggleWarningSubmit = () => setWarningSubmit(prevState => !prevState);

  const { initialData, modifiedData, isLoading } = reducerState.toJS();
  const source = getQueryParameters(search, 'source');
  const abortController = new AbortController();
  const { signal } = abortController;
  const params = source === 'content-manager' ? {} : { source };

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

  const getListDisplayedFields = () =>
    get(modifiedData, ['layouts', 'list'], []);

  const getPluginHeaderActions = () => {
    if (isEqual(modifiedData, initialData)) {
      return [];
    }

    return [
      {
        label: `${pluginId}.popUpWarning.button.cancel`,
        kind: 'secondary',
        onClick: toggleWarningCancel,
        type: 'button',
      },
      {
        kind: 'primary',
        label: `${pluginId}.containers.Edit.submit`,
        type: 'submit',
      },
    ];
  };

  const getSelectOptions = input => {
    if (input.name === 'settings.defaultSortBy') {
      return getListDisplayedFields();
    }

    return input.selectOptions;
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  };

  const handleConfirm = async () => {
    try {
      const body = cloneDeep(modifiedData);

      delete body.schema;
      delete body.uid;
      delete body.source;

      await request(getRequestUrl(`content-types/${slug}`), {
        method: 'PUT',
        body,
        params,
        signal,
      });

      dispatch({
        type: 'SUBMIT_SUCCEEDED',
      });
      emitEvent('didSaveContentTypeLayout');
    } catch (err) {
      strapi.notification.error('notification.error');
    } finally {
      toggleWarningSubmit();
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    toggleWarningSubmit();
    emitEvent('willSaveContentTypeLayout');
  };

  return (
    <>
      <SettingsViewWrapper
        getSelectOptions={getSelectOptions}
        inputs={forms}
        isLoading={isLoading}
        modifiedData={modifiedData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        pluginHeaderProps={{
          actions: getPluginHeaderActions(),
          title: {
            id: `${pluginId}.components.SettingsViewWrapper.pluginHeader.title`,
            values: { name: upperFirst(slug) },
          },
          description: {
            id: `${pluginId}.components.SettingsViewWrapper.pluginHeader.description.list-settings`,
          },
        }}
      >
        <div className="row">
          <div className="col-12">
            <SortWrapper style={{ display: 'flex' }}>
              {getListDisplayedFields().map(item => {
                return <DraggedField key={item} name={item} />;
              })}
            </SortWrapper>
          </div>
        </div>
      </SettingsViewWrapper>
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
            type: 'ON_RESET',
          });
          toggleWarningCancel();
        }}
      />
      <PopUpWarning
        isOpen={showWarningSubmit}
        toggleModal={toggleWarningSubmit}
        content={{
          title: `${pluginId}.popUpWarning.title`,
          message: `${pluginId}.popUpWarning.warning.updateAllSettings`,
          cancel: `${pluginId}.popUpWarning.button.cancel`,
          confirm: `${pluginId}.popUpWarning.button.confirm`,
        }}
        popUpWarningType="danger"
        onConfirm={handleConfirm}
      />
    </>
  );
};

SettingViewList.propTypes = {
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }).isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default SettingViewList;
