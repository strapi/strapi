import React, { memo, useMemo, useReducer, useState } from 'react';
import PropTypes from 'prop-types';
import { get, pick } from 'lodash';
import { request, useGlobalContext } from 'strapi-helper-plugin';
import { FormattedMessage, useIntl } from 'react-intl';
import { useDrop } from 'react-dnd';
import { DropdownItem } from 'reactstrap';
import { Inputs as Input } from '@buffetjs/custom';
import pluginId from '../../pluginId';
import { checkIfAttributeIsDisplayable, ItemTypes, getRequestUrl } from '../../utils';
import PopupForm from '../../components/PopupForm';
import SettingsViewWrapper from '../../components/SettingsViewWrapper';
import SortWrapper from '../../components/SortWrapper';
import LayoutDndProvider from '../LayoutDndProvider';
import Label from './Label';
import MenuDropdown from './MenuDropdown';
import DropdownButton from './DropdownButton';
import DragWrapper from './DragWrapper';
import Toggle from './Toggle';
import init from './init';
import reducer, { initialState } from './reducer';
import forms from './forms.json';

const ListSettingsView = ({ layout, slug, updateLayout }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, layout)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isModalFormOpen, setIsModalFormOpen] = useState(false);
  const [isDraggingSibling, setIsDraggingSibling] = useState(false);
  const { formatMessage } = useIntl();
  const { emitEvent, updateMenu } = useGlobalContext();
  const toggleModalForm = () => setIsModalFormOpen(prevState => !prevState);
  const { labelForm, labelToEdit, initialData, modifiedData } = reducerState.toJS();
  const attributes = useMemo(() => {
    return get(modifiedData, ['attributes'], {});
  }, [modifiedData]);

  const getName = useMemo(() => {
    return get(modifiedData, ['info', 'name'], '');
  }, [modifiedData]);

  const displayedFields = useMemo(() => {
    return get(modifiedData, ['layouts', 'list'], []);
  }, [modifiedData]);

  const listRemainingFields = useMemo(() => {
    const metadatas = get(modifiedData, ['metadatas'], {});

    return Object.keys(metadatas)
      .filter(key => {
        return checkIfAttributeIsDisplayable(get(attributes, key, {}));
      })
      .filter(field => {
        return !displayedFields.includes(field);
      })
      .sort();
  }, [displayedFields, attributes, modifiedData]);

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
      const body = pick(modifiedData, ['layouts', 'settings', 'metadatas']);

      const response = await request(getRequestUrl(`content-types/${slug}/configuration`), {
        method: 'PUT',
        body,
      });

      updateLayout(response.data);

      dispatch({
        type: 'SUBMIT_SUCCEEDED',
      });
      emitEvent('didEditListSettings');
    } catch (err) {
      strapi.notification.toggle({
        type: 'warning',
        message: { id: 'notification.error' },
      });
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

  const renderForm = () => {
    const type = get(attributes, [labelToEdit, 'type'], 'text');
    const relationType = get(attributes, [labelToEdit, 'relationType']);
    let shouldDisplaySortToggle = !['media', 'relation'].includes(type);
    const label = formatMessage({ id: `${pluginId}.form.Input.label` });
    const description = formatMessage({ id: `${pluginId}.form.Input.label.inputDescription` });

    if (['oneWay', 'oneToOne', 'manyToOne'].includes(relationType)) {
      shouldDisplaySortToggle = true;
    }

    return (
      <>
        <div className="col-6" style={{ marginBottom: 4 }}>
          <Input
            description={description}
            label={label}
            type="text"
            name="label"
            onBlur={() => {}}
            value={get(labelForm, 'label', '')}
            onChange={handleChangeEditLabel}
          />
        </div>
        {shouldDisplaySortToggle && (
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
  };

  return (
    <LayoutDndProvider
      isDraggingSibling={isDraggingSibling}
      setIsDraggingSibling={setIsDraggingSibling}
    >
      <SettingsViewWrapper
        displayedFields={displayedFields}
        inputs={forms}
        isLoading={false}
        initialData={initialData}
        modifiedData={modifiedData}
        onChange={handleChange}
        onConfirmReset={() => {
          dispatch({
            type: 'ON_RESET',
          });
        }}
        onConfirmSubmit={handleConfirm}
        onModalConfirmClosed={updateMenu}
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
                {displayedFields.map((item, index) => {
                  const label = get(modifiedData, ['metadatas', item, 'list', 'label'], '');

                  return (
                    <Label
                      count={displayedFields.length}
                      key={item}
                      index={index}
                      isDraggingSibling={isDraggingSibling}
                      label={label}
                      move={move}
                      name={item}
                      onClick={handleClickEditLabel}
                      onRemove={e => {
                        e.stopPropagation();

                        if (displayedFields.length === 1) {
                          strapi.notification.toggle({
                            type: 'info',
                            message: { id: `${pluginId}.notification.info.minimumFields` },
                          });
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
              if (listRemainingFields.length > 0) {
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
            <Toggle disabled={listRemainingFields.length === 0} />
            <MenuDropdown>
              {listRemainingFields.map(item => (
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
        type={get(attributes, [labelToEdit, 'type'], 'text')}
      />
    </LayoutDndProvider>
  );
};

ListSettingsView.propTypes = {
  layout: PropTypes.shape({
    uid: PropTypes.string.isRequired,
    settings: PropTypes.object.isRequired,
    metadatas: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,
    attributes: PropTypes.object.isRequired,
  }).isRequired,
  slug: PropTypes.string.isRequired,
  updateLayout: PropTypes.func.isRequired,
};

export default memo(ListSettingsView);
