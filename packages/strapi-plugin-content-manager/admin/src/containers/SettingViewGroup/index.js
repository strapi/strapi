import React, {
  memo,
  useCallback,
  useEffect,
  useReducer,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { get, isEqual, set, upperFirst } from 'lodash';

import {
  BackHeader,
  InputsIndex as Input,
  PluginHeader,
  PopUpWarning,
  LoadingIndicatorPage,
  request,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import { LayoutDndProvider } from '../../contexts/LayoutDnd';
import { formatLayout as updateLayout, createLayout } from '../../utils/layout';

import Block from '../../components/Block';
import Container from '../../components/Container';
import FieldsReorder from '../../components/FieldsReorder';
import FormTitle from '../../components/FormTitle';
import LayoutTitle from '../../components/LayoutTitle';
import SectionTitle from '../../components/SectionTitle';
import Separator from '../../components/Separator';

import reducer, { initialState } from './reducer';

const getRequestUrl = path => `/${pluginId}/groups/${path}`;

function SettingViewGroup({
  history: { goBack },
  match: {
    params: { name },
  },
}) {
  const [showWarningSubmit, setWarningSubmit] = useState(false);
  const [showWarningCancel, setWarningCancel] = useState(false);
  const toggleWarningSubmit = () => setWarningSubmit(prevState => !prevState);
  const toggleWarningCancel = () => setWarningCancel(prevState => !prevState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { initialData, isLoading, modifiedData } = state.toJS();

  useEffect(() => {
    const abortControllerFetchData = new AbortController();
    const signalFetchData = abortControllerFetchData.signal;

    const fetchGroupLayout = async () => {
      try {
        const { data: layout } = await request(getRequestUrl(name), {
          method: 'GET',
          signal: signalFetchData,
        });

        // Create the object needed for the reorder
        set(
          layout,
          ['layouts', 'edit'],
          updateLayout(createLayout(layout.layouts.edit))
        );

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: layout,
        });
      } catch (err) {
        if (err.code !== 20) {
          strapi.notification.error('notification.error');
        }
      }
    };

    fetchGroupLayout();

    return () => {
      abortControllerFetchData.abort();
    };
  }, [name]);

  // TODO change with usememo
  const getAttributes = useCallback(() => {
    return get(modifiedData, ['schema', 'attributes'], {});
  }, [modifiedData]);
  const getEditLayout = useCallback(() => {
    return get(modifiedData, ['layouts', 'edit'], []);
  }, [modifiedData]);
  const getEditRemaingFields = () => {
    const attributes = getAttributes();
    const displayedFields = getEditLayout().reduce(
      (acc, curr) => [...acc, ...curr.rowContent],
      []
    );

    return Object.keys(attributes).filter(attr => {
      return displayedFields.findIndex(el => el.name === attr) === -1;
    });
  };

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const handleSubmit = e => {
    e.preventDefault();
    // emitEvent
    toggleWarningSubmit();
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
        onClick: e => {
          handleSubmit(e);
        },
        type: 'submit',
      },
    ];
  };
  const getSelectOptions = () => {
    const attributes = getAttributes();
    const options = Object.keys(attributes).filter(attr => {
      const type = get(attributes, [attr, 'type'], '');

      return (
        !['json', 'text', 'relation', 'group', 'boolean', 'date'].includes(
          type
        ) && !!type
      );
    });

    return options;
  };

  return (
    <LayoutDndProvider
      attributes={getAttributes()}
      buttonData={getEditRemaingFields()}
      layout={getEditLayout()}
      moveItem={(dragIndex, hoverIndex, dragRowIndex, hoverRowIndex) => {
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
      }}
      moveRow={(dragRowIndex, hoverRowIndex) => {
        dispatch({
          type: 'MOVE_ROW',
          dragRowIndex,
          hoverRowIndex,
        });
      }}
      onAddData={name => {
        dispatch({
          type: 'ON_ADD_DATA',
          name,
        });
      }}
      relationsLayout={[]}
      removeField={(rowIndex, fieldIndex) => {
        dispatch({
          type: 'REMOVE_FIELD',
          rowIndex,
          fieldIndex,
        });
      }}
    >
      <BackHeader onClick={() => goBack()} />
      <Container className="container-fluid">
        <form onSubmit={handleSubmit}>
          <PluginHeader
            actions={getPluginHeaderActions()}
            title={{
              id: `${pluginId}.containers.SettingViewModel.pluginHeader.title`,
              values: { name: upperFirst(name) },
            }}
            description={{
              id: `${pluginId}.containers.SettingPage.pluginHeaderDescription`,
            }}
          />
          <div className="row">
            <Block style={{ paddingTop: '24px' }}>
              <SectionTitle isSettings />
              <div className="row">
                <Input
                  customBootstrapClass="col-md-4"
                  didCheckErrors={false}
                  inputDescription={{
                    id: `${pluginId}.containers.SettingPage.editSettings.entry.title.description`,
                  }}
                  label={{
                    id: `${pluginId}.containers.SettingPage.editSettings.entry.title`,
                  }}
                  name="settings.mainField"
                  onChange={({ target: { name, value } }) => {
                    dispatch({
                      type: 'ON_CHANGE_MAIN_SETTINGS',
                      keys: name.split('.'),
                      value,
                    });
                  }}
                  selectOptions={getSelectOptions()}
                  type="select"
                  validations={{}}
                  value={get(modifiedData, 'settings.mainField', 'id')}
                />
                <div className="col-12">
                  <Separator />
                </div>
              </div>
              <SectionTitle />
              <div className="row">
                <LayoutTitle className="col-12">
                  <FormTitle
                    title={`${pluginId}.global.displayedFields`}
                    description={`${pluginId}.containers.SettingPage.editSettings.description`}
                  />
                </LayoutTitle>
                <FieldsReorder className="col-12" />
              </div>
            </Block>
          </div>
        </form>
      </Container>
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
            type: 'RESET',
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
        onConfirm={e => {
          handleSubmit(e);
        }}
      />
    </LayoutDndProvider>
  );
}

SettingViewGroup.propTypes = {
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }),
  }).isRequired,
};

export default memo(SettingViewGroup);
