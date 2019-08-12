import React, { useEffect, useReducer, memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, size } from 'lodash';

import pluginId from '../../pluginId';
import { useEditView } from '../../contexts/EditView';
import { Button } from './components';
import Form from './Form';
import GroupCollapse from './GroupCollapse';
import init from './init';
import reducer, { initialState } from './reducer';

function Group({
  addField,
  groupErrorKeys,
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
  const { didCheckErrors, errors, resetErrors } = useEditView();
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

  useEffect(() => {
    const collapsesToOpen = Object.keys(errors)
      .filter(errorPath => errorPath.split('.')[0] === name && isRepeatable)
      .map(errorPath => errorPath.split('.')[1]);

    if (collapsesToOpen.length > 0) {
      dispatch({
        type: 'OPEN_COLLAPSES_THAT_HAVE_ERRORS',
        collapsesToOpen: collapsesToOpen.filter(
          (v, index) => collapsesToOpen.indexOf(v) === index
        ),
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [didCheckErrors]);

  const groupValueLength = size(groupValue);

  return (
    <>
      <div className="row">
        <div
          className="col-12"
          style={{
            paddingTop: 0,
            marginTop: '-2px',
            paddingBottom: isRepeatable ? 7 : 14,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {label}&nbsp;
            {isRepeatable && `(${groupValueLength})`}
          </span>
        </div>
      </div>
      {!isRepeatable ? (
        <div
          style={{
            margin: '0 10px',
            padding: '0 15px',
            paddingTop: 21,
            backgroundColor: '#f5f5f5',
            marginBottom: 18,
          }}
        >
          {fields.map((fieldRow, key) => {
            return (
              <div className="row" key={key}>
                {fieldRow.map(field => {
                  const keys = `${name}.${field.name}`;

                  return (
                    <Form
                      key={keys}
                      modifiedData={modifiedData}
                      keys={keys}
                      fieldName={field.name}
                      layout={layout}
                      onChange={onChange}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            margin: '0 10px',
          }}
        >
          {groupValue.map((field, index) => {
            const groupFieldName = `${name}.${index}`;
            const doesPreviousFieldContainErrorsAndIsOpen =
              groupErrorKeys.includes(`${name}.${index - 1}`) &&
              index !== 0 &&
              collapses[index - 1].isOpen === false;
            const hasErrors = groupErrorKeys.includes(groupFieldName);

            return (
              <GroupCollapse
                key={field._temp__id}
                collapseAll={() => {
                  dispatch({
                    type: 'COLLAPSE_ALL',
                  });
                }}
                doesPreviousFieldContainErrorsAndIsOpen={
                  doesPreviousFieldContainErrorsAndIsOpen
                }
                onClick={() => {
                  dispatch({
                    type: 'TOGGLE_COLLAPSE',
                    index,
                  });
                }}
                findField={findField}
                groupName={name}
                hasErrors={hasErrors}
                isFirst={index === 0}
                isOpen={collapses[index].isOpen}
                id={field._temp__id}
                layout={layout}
                modifiedData={modifiedData}
                move={move}
                name={groupFieldName}
                onChange={onChange}
                removeField={e => {
                  e.stopPropagation();

                  if (groupValue.length - 1 < min) {
                    strapi.notification.info(
                      `${pluginId}.components.Group.notification.info.minimum-requirement`
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
                resetErrors={resetErrors}
              />
            );
          })}
          <Button
            doesPreviousFieldContainErrorsAndIsClosed={
              groupValueLength > 0 &&
              groupErrorKeys.includes(`${name}.${groupValueLength - 1}`) &&
              collapses[groupValueLength - 1].isOpen === false
            }
            onClick={() => {
              if (groupValue.length < max) {
                addField(name);

                dispatch({
                  type: 'ADD_NEW_FIELD',
                });
                return;
              }

              strapi.notification.info(
                `${pluginId}.components.Group.notification.info.maximum-requirement`
              );
            }}
            withBorderRadius={groupValue.length === 0}
          >
            <i className="fa fa-plus" />
            <FormattedMessage
              id={`${pluginId}.containers.EditView.Group.add.new`}
            />
          </Button>
        </div>
      )}
    </>
  );
}

Group.defaultProps = {
  addRelation: () => {},
  groupErrorKeys: [],
  groupValue: {},
  label: '',
  layout: {},
  max: Infinity,
  min: -Infinity,
  modifiedData: {},
};

Group.propTypes = {
  addField: PropTypes.func.isRequired,
  addRelation: PropTypes.func,
  groupErrorKeys: PropTypes.array,
  groupValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  isRepeatable: PropTypes.bool.isRequired,
  label: PropTypes.string,
  layout: PropTypes.object,
  max: PropTypes.number,
  min: PropTypes.number,
  modifiedData: PropTypes.object,
  moveGroupField: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  pathname: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  removeField: PropTypes.func.isRequired,
};

export default memo(Group);
