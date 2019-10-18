import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
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
import { LayoutDndProvider } from '../../contexts/LayoutDnd';
import getRequestUrl from '../../utils/getRequestUrl';
import FieldsReorder from '../../components/FieldsReorder';
import FormTitle from '../../components/FormTitle';
import LayoutTitle from '../../components/LayoutTitle';
import SettingsViewWrapper from '../../components/SettingsViewWrapper';

import reducer, { initialState } from './reducer';

const EditSettingsView = ({
  // deleteLayout,
  history: { push },
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

  const getEditLayout = useCallback(() => {
    return get(modifiedData, ['layouts', 'edit'], []);
  }, [modifiedData]);

  const getRelationsLayout = useCallback(() => {
    return get(modifiedData, ['layouts', 'editRelations'], []);
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

  const getEditRemainingFields = () => {
    const attributes = getAttributes;
    const metadatas = get(modifiedData, ['metadatas'], {});
    const displayedFields = getEditLayout().reduce(
      (acc, curr) => [...acc, ...curr.rowContent],
      []
    );

    return Object.keys(attributes)
      .filter(attr => get(attributes, [attr, 'type'], '') !== 'relation')
      .filter(attr => get(metadatas, [attr, 'edit', 'visible'], false) === true)
      .filter(attr => {
        return displayedFields.findIndex(el => el.name === attr) === -1;
      });
  };

  const handleConfirm = async () => {};

  const moveItem = (dragIndex, hoverIndex, dragRowIndex, hoverRowIndex) => {
    // Same row = just reorder
    if (dragRowIndex === hoverRowIndex) {
      dispatch({
        type: 'REORDER_ROW',
        dragRowIndex,
        dragIndex,
        hoverIndex,
      });
    } else {
      dispatch({
        type: 'REORDER_DIFF_ROW',
        dragIndex,
        hoverIndex,
        dragRowIndex,
        hoverRowIndex,
      });
    }
  };

  const moveRow = (dragRowIndex, hoverRowIndex) => {
    dispatch({
      type: 'MOVE_ROW',
      dragRowIndex,
      hoverRowIndex,
    });
  };

  return (
    <LayoutDndProvider
      attributes={getAttributes}
      buttonData={getEditRemainingFields()}
      goTo={push}
      layout={getEditLayout()}
      metadatas={get(modifiedData, ['metadatas'], {})}
      moveItem={moveItem}
      moveRow={moveRow}
      onAddData={name => {
        dispatch({
          type: 'ON_ADD_DATA',
          name,
        });
      }}
      relationsLayout={getRelationsLayout()}
      removeField={(rowIndex, fieldIndex) => {
        dispatch({
          type: 'REMOVE_FIELD',
          rowIndex,
          fieldIndex,
        });
      }}
      setEditFieldToSelect={() => {}}
      selectedItemName={''}
    >
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
        <div className="row">
          <LayoutTitle className="col-8">
            <FormTitle
              title={`${pluginId}.global.displayedFields`}
              description={`${pluginId}.containers.SettingPage.editSettings.description`}
            />
          </LayoutTitle>

          <FieldsReorder />
        </div>
      </SettingsViewWrapper>
    </LayoutDndProvider>
  );
};

EditSettingsView.propTypes = {
  // deleteLayout: PropTypes.func.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func,
  }).isRequired,
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
