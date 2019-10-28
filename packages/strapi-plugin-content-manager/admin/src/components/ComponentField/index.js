import React, { useEffect, useReducer, memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, size } from 'lodash';

import pluginId from '../../pluginId';
import { useEditView } from '../../contexts/EditView';
import Button from './Button';
import ComponentCollapse from './ComponentCollapse';
import EmptyComponent from './EmptyComponent';
import P from './P';
import ResetComponent from './ResetComponent';
import init from './init';
import reducer, { initialState } from './reducer';
import NonRepeatableComponent from './NonRepeatableComponent';

function ComponentField({
  addField,
  componentErrorKeys,
  moveComponentField,
  componentValue,
  isRepeatable,
  label,
  layout,
  min,
  max,
  modifiedData,
  name,
  onChange,
  removeField,
}) {
  const {
    checkFormErrors,
    didCheckErrors,
    errors,
    resetErrors,
    resetComponentData,
  } = useEditView();
  const fields = get(layout, ['layouts', 'edit'], []);
  const [state, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, componentValue)
  );
  const { collapses } = state.toJS();

  const findField = React.useCallback(
    id => {
      const field = componentValue.filter(
        current => current._temp__id === id
      )[0];

      return {
        field,
        index: componentValue.indexOf(field),
      };
    },
    [componentValue]
  );

  const move = React.useCallback(
    (id, atIndex) => {
      const { index } = findField(id);

      moveComponentField(index, atIndex, name);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [componentValue]
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

  const componentValueLength = size(componentValue);
  const isInitialized = get(modifiedData, name, null) !== null;

  return (
    <>
      <div className="row">
        <div
          className="col-12"
          style={{
            paddingTop: 0,
            marginTop: '-2px',
            paddingBottom: isRepeatable ? 7 : 14,
            position: 'relative',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {label}&nbsp;
            {isRepeatable && `(${componentValueLength})`}
          </span>
          {!isRepeatable && isInitialized && (
            <ResetComponent
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                resetComponentData(name);
              }}
            >
              <FormattedMessage id={`${pluginId}.components.reset-entry`} />
              <div />
            </ResetComponent>
          )}
        </div>
      </div>

      {!isRepeatable ? (
        <NonRepeatableComponent
          addField={addField}
          isInitialized={isInitialized}
          fields={fields}
          modifiedData={modifiedData}
          layout={layout}
          name={name}
          onChange={onChange}
        />
      ) : (
        <div
          style={{
            margin: '0 15px',
          }}
        >
          {componentValue.length === 0 && (
            <EmptyComponent>
              <FormattedMessage id={`${pluginId}.components.empty-repeatable`}>
                {msg => <P>{msg}</P>}
              </FormattedMessage>
            </EmptyComponent>
          )}
          {componentValue.map((field, index) => {
            const componentFieldName = `${name}.${index}`;
            const doesPreviousFieldContainErrorsAndIsOpen =
              componentErrorKeys.includes(`${name}.${index - 1}`) &&
              index !== 0 &&
              collapses[index - 1].isOpen === false;
            const hasErrors = componentErrorKeys.includes(componentFieldName);

            return (
              <ComponentCollapse
                key={field._temp__id}
                checkFormErrors={checkFormErrors}
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
                componentName={name}
                hasErrors={hasErrors}
                isFirst={index === 0}
                isOpen={collapses[index].isOpen}
                id={field._temp__id}
                layout={layout}
                modifiedData={modifiedData}
                move={move}
                name={componentFieldName}
                onChange={onChange}
                removeField={e => {
                  e.stopPropagation();

                  if (componentValue.length - 1 < min) {
                    strapi.notification.info(
                      `${pluginId}.components.notification.info.minimum-requirement`
                    );
                  }

                  const shouldAddEmptyField = componentValue.length - 1 < min;

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
              componentValueLength > 0 &&
              componentErrorKeys.includes(
                `${name}.${componentValueLength - 1}`
              ) &&
              collapses[componentValueLength - 1].isOpen === false
            }
            onClick={() => {
              if (componentValue.length < max) {
                addField(name);

                dispatch({
                  type: 'ADD_NEW_FIELD',
                });
                return;
              }

              strapi.notification.info(
                `${pluginId}.components.notification.info.maximum-requirement`
              );
            }}
            withBorderRadius={false}
          >
            <i className="fa fa-plus" />
            <FormattedMessage id={`${pluginId}.containers.EditView.add.new`} />
          </Button>
        </div>
      )}
    </>
  );
}

ComponentField.defaultProps = {
  addRelation: () => {},
  componentErrorKeys: [],
  componentValue: {},
  label: '',
  layout: {},
  max: Infinity,
  min: -Infinity,
  modifiedData: {},
};

ComponentField.propTypes = {
  addField: PropTypes.func.isRequired,
  addRelation: PropTypes.func,
  componentErrorKeys: PropTypes.array,
  componentValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  isRepeatable: PropTypes.bool.isRequired,
  label: PropTypes.string,
  layout: PropTypes.object,
  max: PropTypes.number,
  min: PropTypes.number,
  modifiedData: PropTypes.object,
  moveComponentField: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  pathname: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  removeField: PropTypes.func.isRequired,
};

export default memo(ComponentField);
