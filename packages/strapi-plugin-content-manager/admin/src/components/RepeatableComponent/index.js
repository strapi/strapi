/* eslint-disable import/no-cycle */
import React, { memo, useReducer } from 'react';
import { useDrop } from 'react-dnd';
import PropTypes from 'prop-types';
import { get, take } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { ErrorMessage } from '@buffetjs/styles';
import pluginId from '../../pluginId';
import ItemTypes from '../../utils/ItemTypes';
import connect from './utils/connect';
import select from './utils/select';
import Button from './AddFieldButton';
import DraggedItem from './DraggedItem';
import EmptyComponent from './EmptyComponent';
import init from './init';
import reducer, { initialState } from './reducer';

const RepeatableComponent = ({
  addRepeatableComponentToField,
  formErrors,
  componentUid,
  componentValue,
  componentValueLength,
  fields,
  isNested,
  isReadOnly,
  max,
  min,
  name,
  schema,
}) => {
  const [, drop] = useDrop({ accept: ItemTypes.COMPONENT });

  const componentErrorKeys = Object.keys(formErrors)
    .filter(errorKey => {
      return take(errorKey.split('.'), isNested ? 3 : 1).join('.') === name;
    })
    .map(errorKey => {
      return errorKey
        .split('.')
        .slice(0, name.split('.').length + 1)
        .join('.');
    });

  // We need to synchronize the collapses array with the data
  // The key needed for react in the list will be the one from the collapses data
  // This way we don't have to mutate the data when it is received and we can use a unique key
  const [state, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, componentValue)
  );
  const { collapses } = state.toJS();
  const toggleCollapses = index => {
    dispatch({
      type: 'TOGGLE_COLLAPSE',
      index,
    });
  };
  const missingComponentsValue = min - componentValueLength;
  const errorsArray = componentErrorKeys.map(key => get(formErrors, [key, 'id'], ''));

  const hasMinError =
    get(errorsArray, [0], '').includes('min') && !collapses.some(obj => obj.isOpen === true);

  return (
    <div>
      {componentValueLength === 0 && (
        <EmptyComponent hasMinError={hasMinError}>
          <FormattedMessage id={`${pluginId}.components.empty-repeatable`}>
            {msg => <p>{msg}</p>}
          </FormattedMessage>
        </EmptyComponent>
      )}
      <div ref={drop}>
        {componentValueLength > 0 &&
          componentValue.map((data, index) => {
            const componentFieldName = `${name}.${index}`;
            const doesPreviousFieldContainErrorsAndIsOpen =
              componentErrorKeys.includes(`${name}.${index - 1}`) &&
              index !== 0 &&
              get(collapses, [index - 1, 'isOpen'], false) === false;
            const hasErrors = componentErrorKeys.includes(componentFieldName);

            return (
              <DraggedItem
                fields={fields}
                componentFieldName={componentFieldName}
                componentUid={componentUid}
                doesPreviousFieldContainErrorsAndIsOpen={doesPreviousFieldContainErrorsAndIsOpen}
                hasErrors={hasErrors}
                hasMinError={hasMinError}
                isFirst={index === 0}
                isReadOnly={isReadOnly}
                isOpen={get(collapses, [index, 'isOpen'], false)}
                key={get(collapses, [index, '_temp__id'], null)}
                onClickToggle={() => {
                  // Close all other collapses and open the selected one
                  toggleCollapses(index);
                }}
                removeCollapse={() => {
                  dispatch({
                    type: 'REMOVE_COLLAPSE',
                    index,
                  });
                }}
                moveCollapse={(dragIndex, hoverIndex) => {
                  dispatch({
                    type: 'MOVE_COLLAPSE',
                    dragIndex,
                    hoverIndex,
                  });
                }}
                parentName={name}
                schema={schema}
                toggleCollapses={toggleCollapses}
              />
            );
          })}
      </div>
      <Button
        hasMinError={hasMinError}
        disabled={isReadOnly}
        withBorderRadius={false}
        doesPreviousFieldContainErrorsAndIsClosed={
          componentValueLength > 0 &&
          componentErrorKeys.includes(`${name}.${componentValueLength - 1}`) &&
          collapses[componentValueLength - 1].isOpen === false
        }
        type="button"
        onClick={() => {
          if (!isReadOnly) {
            if (componentValueLength < max) {
              const shouldCheckErrors = hasMinError;

              addRepeatableComponentToField(name, componentUid, shouldCheckErrors);
              dispatch({
                type: 'ADD_NEW_FIELD',
              });
            } else if (componentValueLength >= max) {
              strapi.notification.info(
                `${pluginId}.components.notification.info.maximum-requirement`
              );
            }
          }
        }}
      >
        <i className="fa fa-plus" />
        <FormattedMessage id={`${pluginId}.containers.EditView.add.new`} />
      </Button>
      {hasMinError && (
        <ErrorMessage>
          <FormattedMessage
            id={`${pluginId}.components.DynamicZone.missing${
              missingComponentsValue > 1 ? '.plural' : '.singular'
            }`}
            values={{ count: missingComponentsValue }}
          />
        </ErrorMessage>
      )}
    </div>
  );
};

RepeatableComponent.defaultProps = {
  componentValue: null,
  componentValueLength: 0,
  fields: [],
  formErrors: {},
  isNested: false,
  max: Infinity,
  min: -Infinity,
};

RepeatableComponent.propTypes = {
  addRepeatableComponentToField: PropTypes.func.isRequired,
  componentUid: PropTypes.string.isRequired,
  componentValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  componentValueLength: PropTypes.number,
  fields: PropTypes.array,
  formErrors: PropTypes.object,
  isNested: PropTypes.bool,
  isReadOnly: PropTypes.bool.isRequired,
  max: PropTypes.number,
  min: PropTypes.number,
  name: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired,
};

const Memoized = memo(RepeatableComponent);

export default connect(Memoized, select);

export { RepeatableComponent };
