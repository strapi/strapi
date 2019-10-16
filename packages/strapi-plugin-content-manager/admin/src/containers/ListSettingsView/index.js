import React, { useEffect, useMemo, useReducer, useState } from 'react';
import PropTypes from 'prop-types';
import { cloneDeep, get, isEqual, upperFirst } from 'lodash';
import {
  PopUpWarning,
  getQueryParameters,
  request,
  useGlobalContext,
} from 'strapi-helper-plugin';
import { DropdownItem } from 'reactstrap';
import pluginId from '../../pluginId';
import getRequestUrl from '../../utils/getRequestUrl';
import DraggedField from '../../components/DraggedField';
import SettingsViewWrapper from '../../components/SettingsViewWrapper';
import SortWrapper from '../../components/SortWrapper';
import MenuDropdown from './MenuDropdown';
import DropdownButton from './DropdownButton';
import Toggle from './Toggle';
import reducer, { initialState } from './reducer';
import forms from './forms.json';

const ListSettingsView = ({
  deleteLayout,
  location: { search },
  match: {
    params: { slug },
  },
}) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const [showWarningCancel, setWarningCancel] = useState(false);
  const [showWarningSubmit, setWarningSubmit] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { emitEvent } = useGlobalContext();

  const toggleWarningCancel = () => setWarningCancel(prevState => !prevState);
  const toggleWarningSubmit = () => setWarningSubmit(prevState => !prevState);

  const { initialData, modifiedData, isLoading } = reducerState.toJS();
  const source = getQueryParameters(search, 'source');
  const abortController = new AbortController();
  const { signal } = abortController;
  const params = source === 'content-manager' ? {} : { source };

  const getAttributes = useMemo(() => {
    return get(modifiedData, ['schema', 'attributes'], {});
  }, [modifiedData]);

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

  const getListRemainingFields = () => {
    const metadatas = get(modifiedData, ['metadatas'], {});
    const attributes = getAttributes;

    return Object.keys(metadatas)
      .filter(key => {
        const type = get(attributes, [key, 'type'], '');

        return !['json', 'relation', 'group'].includes(type) && !!type;
      })
      .filter(field => {
        return !getListDisplayedFields().includes(field);
      });
  };

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
      return [
        'id',
        ...getListDisplayedFields().filter(
          name =>
            get(getAttributes, [name, 'type'], '') !== 'media' && name !== 'id'
        ),
      ];
    }

    return input.options;
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value: name === 'settings.pageSize' ? parseInt(value, 10) : value,
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
      deleteLayout(slug);
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
            <SortWrapper
              style={{
                display: 'table',
                paddingLeft: 5,
                paddingRight: 5,
                paddingBottom: 11,
                width: '100%',
                overflow: 'auto',
              }}
            >
              {getListDisplayedFields().map((item, index) => {
                return (
                  <DraggedField
                    key={item}
                    name={item}
                    onRemove={() => {
                      if (getListDisplayedFields().length === 1) {
                        strapi.notification.info(
                          `${pluginId}.notification.info.minimumFields`
                        );
                      } else {
                        dispatch({
                          type: 'REMOVE_FIELD',
                          index,
                        });
                      }
                    }}
                  />
                );
              })}
              <DropdownButton
                isOpen={isOpen}
                toggle={() => {
                  if (getListRemainingFields().length > 0) {
                    setIsOpen(prevState => !prevState);
                  }
                }}
                direction="down"
              >
                <Toggle disabled={getListRemainingFields().length === 0} />
                <MenuDropdown>
                  {getListRemainingFields().map(item => (
                    <DropdownItem
                      key={item}
                      onClick={() => {
                        dispatch({
                          type: 'ADD_FIELD',
                          item,
                        });
                      }}
                    >
                      {item}
                    </DropdownItem>
                  ))}
                </MenuDropdown>
              </DropdownButton>
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

ListSettingsView.propTypes = {
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

export default ListSettingsView;
