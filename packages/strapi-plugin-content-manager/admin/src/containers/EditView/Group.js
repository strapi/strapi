import React, { useReducer, memo } from 'react';
import { fromJS } from 'immutable';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, isArray } from 'lodash';

import pluginId from '../../pluginId';

import { Button } from './components';
import GroupCollapse from './GroupCollapse';
import Inputs from './Inputs';

const initialState = fromJS({ collapses: [] });

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_NEW_FIELD':
      return state.update('collapses', list => {
        return list
          .map(obj => obj.update('isOpen', () => false))
          .push(fromJS({ isOpen: true }));
      });
    case 'COLLAPSE_ALL':
      return state.update('collapses', list =>
        list.map(obj => obj.update('isOpen', () => false))
      );
    case 'TOGGLE_COLLAPSE':
      return state.update('collapses', list => {
        return list.map((obj, index) => {
          if (index === action.index) {
            return obj.update('isOpen', v => !v);
          }

          return obj.update('isOpen', () => false);
        });
      });
    case 'REMOVE_COLLAPSE':
      return state
        .removeIn(['collapses', action.index])
        .update('collapses', list => list.map(obj => obj.set('isOpen', false)))
        .update('collapses', list => {
          if (action.shouldAddEmptyField) {
            return list.push(fromJS({ isOpen: true }));
          }

          return list;
        });
    default:
      return state;
  }
}

function init(initialState, groupValues) {
  return initialState.update('collapses', list => {
    if (isArray(groupValues)) {
      return fromJS(
        groupValues.map((_, index) => ({
          isOpen: index === groupValues.length - 1,
        }))
      );
    }

    return list;
  });
}

function Group({
  addField,
  isRepeatable,
  label,
  layout,
  min,
  max,
  modifiedData,
  moveGroupField,
  name,
  groupValue,
  onChange,
  removeField,
}) {
  const fields = get(layout, ['layouts', 'edit'], []);
  const [state, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, groupValue)
  );
  const { collapses } = state.toJS();

  const findField = React.useCallback(
    id => {
      const field = groupValue.filter(current => current._temp__id === id)[0];

      return {
        field,
        index: groupValue.indexOf(field),
      };
    },
    [groupValue]
  );

  const move = React.useCallback(
    (id, atIndex) => {
      const { index } = findField(id);

      moveGroupField(index, atIndex, name);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupValue]
  );

  return (
    <>
      <div className="row">
        <div className="col-12" style={{ paddingTop: 16, paddingBottom: 15 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        </div>
      </div>
      <div
        className="row"
        style={{
          marginLeft: '-10px',
          marginRight: '-10px',
          backgroundColor: '#f5f5f5',
          padding: '0 20px 10px 10px',
          paddingTop: isRepeatable ? '13px' : '20px',
        }}
      >
        {!isRepeatable ? (
          <div className="col-12">
            {fields.map((fieldRow, key) => {
              return (
                <div className="row" key={key}>
                  {fieldRow.map(field => {
                    return (
                      <Inputs
                        key={`${name}.${field.name}`}
                        layout={layout}
                        modifiedData={modifiedData}
                        keys={`${name}.${field.name}`}
                        name={`${field.name}`}
                        onChange={({ target: { value } }) => {
                          onChange({
                            target: { name: `${name}.${field.name}`, value },
                          });
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="col-12">
            <div className="row">
              {groupValue.map((field, index) => {
                return (
                  <div className="col-12" key={field._temp__id}>
                    <GroupCollapse
                      collapseAll={() => {
                        dispatch({
                          type: 'COLLAPSE_ALL',
                        });
                      }}
                      onClick={() => {
                        dispatch({
                          type: 'TOGGLE_COLLAPSE',
                          index,
                        });
                      }}
                      findField={findField}
                      groupName={name}
                      isOpen={collapses[index].isOpen}
                      id={field._temp__id}
                      layout={layout}
                      modifiedData={modifiedData}
                      move={move}
                      name={`${name}.${index}`}
                      onChange={onChange}
                      removeField={e => {
                        e.stopPropagation();

                        if (groupValue.length - 1 < min) {
                          strapi.notification.info(
                            'A empty field has been added to match the requirements'
                          );
                        }

                        const shouldAddEmptyField = groupValue.length - 1 < min;

                        dispatch({
                          type: 'REMOVE_COLLAPSE',
                          index,
                          shouldAddEmptyField,
                        });
                        removeField(`${name}.${index}`, shouldAddEmptyField);
                      }}
                    />
                  </div>
                );
              })}

              <div className="col-12">
                <Button
                  onClick={() => {
                    if (groupValue.length < max) {
                      addField(name);

                      dispatch({
                        type: 'ADD_NEW_FIELD',
                      });
                      return;
                    }

                    strapi.notification.info(
                      'You have already reached the maximum'
                    );
                  }}
                >
                  <i className="fa fa-plus" />
                  <FormattedMessage
                    id={`${pluginId}.containers.EditView.Group.add.new`}
                  />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

Group.defaultProps = {
  groupValue: {},
  label: '',
  layout: {},
  max: Infinity,
  min: -Infinity,
  modifiedData: {},
  onChange: () => {},
};

Group.propTypes = {
  addField: PropTypes.func.isRequired,
  groupValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  isRepeatable: PropTypes.bool.isRequired,
  label: PropTypes.string,
  layout: PropTypes.object,
  max: PropTypes.number,
  min: PropTypes.number,
  modifiedData: PropTypes.object,
  moveGroupField: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  removeField: PropTypes.func.isRequired,
};

export default memo(Group);
