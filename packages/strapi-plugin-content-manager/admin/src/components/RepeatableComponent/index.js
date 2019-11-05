import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import Button from './AddFieldButton';
import DraggedItem from './DraggedItem';
import EmptyComponent from './EmptyComponent';
import init from './init';
import reducer, { initialState } from './reducer';

const RepeatableComponent = ({
  componentValue,
  componentValueLength,
  fields,
  name,
  schema,
}) => {
  const {
    addRepeatableComponentToField,
    // modifiedData,
    // removeComponentFromField,
  } = useDataManager();

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

  return (
    <div>
      {componentValueLength === 0 && (
        <EmptyComponent>
          <FormattedMessage id={`${pluginId}.components.empty-repeatable`}>
            {msg => <p>{msg}</p>}
          </FormattedMessage>
        </EmptyComponent>
      )}
      {componentValueLength > 0 &&
        componentValue.map((data, index) => {
          const componentFieldName = `${name}.${index}`;

          return (
            <DraggedItem
              fields={fields}
              componentFieldName={componentFieldName}
              isOpen={collapses[index].isOpen}
              key={collapses[index]._temp__id}
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
              schema={schema}
              toggleCollapses={toggleCollapses}
            />
          );
        })}
      <Button
        withBorderRadius={false}
        type="button"
        onClick={() => {
          // TODO min max validations
          // TODO add componentUID
          addRepeatableComponentToField(name);
          dispatch({
            type: 'ADD_NEW_FIELD',
          });
        }}
      >
        <i className="fa fa-plus" />
        <FormattedMessage id={`${pluginId}.containers.EditView.add.new`} />
      </Button>
    </div>
  );
};

RepeatableComponent.defaultProps = {
  componentValue: null,
  componentValueLength: 0,
  fields: [],
};

RepeatableComponent.propTypes = {
  componentValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  componentValueLength: PropTypes.number,
  fields: PropTypes.array,
  name: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired,
};

export default RepeatableComponent;
