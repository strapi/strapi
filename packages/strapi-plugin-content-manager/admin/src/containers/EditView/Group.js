import React, { useReducer } from 'react';
import { fromJS } from 'immutable';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get } from 'lodash';
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
      return state.removeIn(['collapses', action.index]);
    default:
      return state;
  }
}

function init(initialState) {
  return initialState;
}

function Group({
  addField,
  isRepeatable,
  label,
  layout,
  // min,
  max,
  modifiedData,
  name,
  groupValue,
  onChange,
  removeField,
}) {
  const fields = get(layout, ['layouts', 'edit'], []);
  const [state, dispatch] = useReducer(reducer, initialState, init);
  const { collapses } = state.toJS();

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
                  <div className="col-12" key={index}>
                    <GroupCollapse
                      onClick={() => {
                        dispatch({
                          type: 'TOGGLE_COLLAPSE',
                          index,
                        });
                      }}
                      isOpen={collapses[index].isOpen}
                      layout={layout}
                      modifiedData={modifiedData}
                      name={`${name}.${index}`}
                      onChange={onChange}
                      removeField={e => {
                        e.stopPropagation();

                        dispatch({
                          type: 'REMOVE_COLLAPSE',
                          index,
                        });
                        removeField(`${name}.${index}`);
                      }}
                      groupName={name}
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
  modifiedData: PropTypes.object,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  removeField: PropTypes.func.isRequired,
};

export default Group;
