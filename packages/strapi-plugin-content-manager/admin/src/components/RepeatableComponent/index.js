import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
// import { get } from 'lodash';
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
  // componentUid,
  fields,
  name,
  schema,
}) => {
  const {
    addRepeatableComponentToField,
    // modifiedData,
    // removeComponentFromField,
  } = useDataManager();
  const [state, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, componentValue)
  );
  const { collapses } = state.toJS();

  console.log({ state: state.toJS(), fields, schema });

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
          console.log({ componentFieldName });

          return (
            <DraggedItem
              fields={fields}
              isOpen={collapses[index].isOpen}
              key={data._temp__id}
              onClickToggle={() => {
                dispatch({
                  type: 'TOGGLE_COLLAPSE',
                  index,
                });
              }}
              schema={schema}
              componentFieldName={componentFieldName}
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
