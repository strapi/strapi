import React, { useEffect, useMemo, useReducer, useState } from 'react';
import PropTypes from 'prop-types';
import { cloneDeep, get } from 'lodash';
import {
  // utils
  request,
  // contexts
  useGlobalContext,
} from 'strapi-helper-plugin';
import { FormattedMessage } from 'react-intl';
import { useDrop } from 'react-dnd';
import { DropdownItem } from 'reactstrap';
import { Inputs as Input } from '@buffetjs/custom';
import pluginId from '../../pluginId';
import ItemTypes from '../../utils/ItemTypes';
import getRequestUrl from '../../utils/getRequestUrl';
import PopupForm from '../../components/PopupForm';
import SettingsViewWrapper from '../../components/SettingsViewWrapper';
import SortWrapper from '../../components/SortWrapper';
import LayoutDndProvider from '../LayoutDndProvider';
import Label from './Label';
import MenuDropdown from './MenuDropdown';
import DropdownButton from './DropdownButton';
import DragWrapper from './DragWrapper';
import Toggle from './Toggle';
import reducer, { initialState } from './reducer';
import forms from './forms.json';

const ListSettingsView = ({ deleteLayout, slug }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalFormOpen, setIsModalFormOpen] = useState(false);
  const [isDraggingSibling, setIsDraggingSibling] = useState(false);

  const { emitEvent } = useGlobalContext();

  const toggleModalForm = () => setIsModalFormOpen(prevState => !prevState);

  const {
    labelForm,
    labelToEdit,
    initialData,
    modifiedData,
    isLoading,
  } = reducerState.toJS();

  const abortController = new AbortController();
  const { signal } = abortController;

  const getAttributes = useMemo(() => {
    return get(modifiedData, ['schema', 'attributes'], {});
  }, [modifiedData]);

  useEffect(() => {
    const getData = async () => {
      try {
        const { data } = await request(getRequestUrl(`content-types/${slug}`), {
          method: 'GET',
          signal,
        });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: data.contentType,
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
  }, [slug]);

  const getName = useMemo(() => {
    return get(modifiedData, ['schema', 'info', 'name'], '');
  }, [modifiedData]);

  const getListDisplayedFields = () =>
    get(modifiedData, ['layouts', 'list'], []);

  const getListRemainingFields = () => {
    const metadatas = get(modifiedData, ['metadatas'], {});
    const attributes = getAttributes;

    return Object.keys(metadatas)
      .filter(key => {
        const type = get(attributes, [key, 'type'], '');

        return (
          !['json', 'component', 'richtext', 'relation'].includes(type) &&
          !!type
        );
      })
      .filter(field => {
        return !getListDisplayedFields().includes(field);
      });
  };

  const handleClickEditLabel = labelToEdit => {
    dispatch({
      type: 'SET_LABEL_TO_EDIT',
      labelToEdit,
    });
    toggleModalForm();
  };

  const handleClosed = () => {
    dispatch({
      type: 'UNSET_LABEL_TO_EDIT',
    });
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value: name === 'settings.pageSize' ? parseInt(value, 10) : value,
    });
  };

  const handleChangeEditLabel = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE_LABEL_METAS',
      name,
      value,
    });
  };

  const handleConfirm = async () => {
    try {
      const body = cloneDeep(modifiedData);

      delete body.schema;
      delete body.uid;

      await request(getRequestUrl(`content-types/${slug}`), {
        method: 'PUT',
        body,
        signal,
      });

      dispatch({
        type: 'SUBMIT_SUCCEEDED',
      });
      deleteLayout(slug);
      emitEvent('didEditListSettings');
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  const move = (originalIndex, atIndex) => {
    dispatch({
      type: 'MOVE_FIELD',
      originalIndex,
      atIndex,
    });
  };

  const [, drop] = useDrop({ accept: ItemTypes.FIELD });

  const renderForm = () => (
    <>
      <div className="col-6" style={{ marginBottom: 4 }}>
        <FormattedMessage id={`${pluginId}.form.Input.label`}>
          {label => (
            <FormattedMessage
              id={`${pluginId}.form.Input.label.inputDescription`}
            >
              {description => (
                <Input
                  description={description}
                  label={label}
                  type="text"
                  name="label"
                  onBlur={() => {}}
                  value={get(labelForm, 'label', '')}
                  onChange={handleChangeEditLabel}
                />
              )}
            </FormattedMessage>
          )}
        </FormattedMessage>
      </div>
      {get(getAttributes, [labelToEdit, 'type'], 'text') !== 'media' && (
        <div className="col-6" style={{ marginBottom: 4 }}>
          <FormattedMessage id={`${pluginId}.form.Input.sort.field`}>
            {label => (
              <Input
                label={label}
                type="bool"
                name="sortable"
                value={get(labelForm, 'sortable', false)}
                onChange={handleChangeEditLabel}
              />
            )}
          </FormattedMessage>
        </div>
      )}
    </>
  );

  return (
    <LayoutDndProvider
      isDraggingSibling={isDraggingSibling}
      setIsDraggingSibling={setIsDraggingSibling}
    >
      <SettingsViewWrapper
        getListDisplayedFields={getListDisplayedFields}
        inputs={forms}
        isLoading={isLoading}
        initialData={initialData}
        modifiedData={modifiedData}
        onChange={handleChange}
        onConfirmReset={() => {
          dispatch({
            type: 'ON_RESET',
          });
        }}
        onConfirmSubmit={handleConfirm}
        name={getName}
      >
        <DragWrapper>
          <div className="row">
            <div className="col-12">
              <SortWrapper
                ref={drop}
                style={{
                  display: 'flex',
                  width: '100%',
                }}
              >
                {getListDisplayedFields().map((item, index) => {
                  const label = get(
                    modifiedData,
                    ['metadatas', item, 'list', 'label'],
                    ''
                  );

                  return (
                    <Label
                      count={getListDisplayedFields().length}
                      key={item}
                      index={index}
                      isDraggingSibling={isDraggingSibling}
                      label={label}
                      move={move}
                      name={item}
                      onClick={handleClickEditLabel}
                      onRemove={e => {
                        e.stopPropagation();

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
                      selectedItem={labelToEdit}
                      setIsDraggingSibling={setIsDraggingSibling}
                    />
                  );
                })}
              </SortWrapper>
            </div>
          </div>
          <DropdownButton
            isOpen={isOpen}
            toggle={() => {
              if (getListRemainingFields().length > 0) {
                setIsOpen(prevState => !prevState);
              }
            }}
            direction="down"
            style={{
              position: 'absolute',
              top: 11,
              right: 10,
            }}
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
        </DragWrapper>
      </SettingsViewWrapper>
      <PopupForm
        headerId={`${pluginId}.containers.ListSettingsView.modal-form.edit-label`}
        isOpen={isModalFormOpen}
        onClosed={handleClosed}
        onSubmit={e => {
          e.preventDefault();
          toggleModalForm();
          dispatch({
            type: 'SUBMIT_LABEL_FORM',
          });
        }}
        onToggle={toggleModalForm}
        renderForm={renderForm}
        subHeaderContent={labelToEdit}
        type={get(getAttributes, [labelToEdit, 'type'], 'text')}
      />
    </LayoutDndProvider>
  );
};

ListSettingsView.propTypes = {
  deleteLayout: PropTypes.func.isRequired,
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }).isRequired,
  slug: PropTypes.string.isRequired,
};

export default ListSettingsView;
