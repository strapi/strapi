import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
// import useEditView from '../../hooks/useEditView';
import NonRepeatableWrapper from '../NonRepeatableWrapper';
import FieldComponent from './index';

const NonRepeatableComponent = ({ fields, name, schema }) => {
  // const { allLayoutData } = useEditView();
  const getField = fieldName => get(schema, ['attributes', fieldName], {});

  return (
    <NonRepeatableWrapper>
      {fields.map((fieldRow, key) => {
        return (
          <div className="row" key={key}>
            {fieldRow.map(field => {
              const currentField = getField(field.name);
              const isComponent = get(currentField, 'type', '') === 'component';

              if (isComponent) {
                const componentUid = currentField.component;

                return (
                  <FieldComponent
                    name={`${name}.${field.name}`}
                    label="cooo"
                    componentUid={componentUid}
                  />
                );
              }
              return (
                <div key={field.name}>
                  {field.name}
                  <br /> type: {currentField.type}
                </div>
              );
            })}
          </div>
        );
      })}
    </NonRepeatableWrapper>
  );
};

NonRepeatableComponent.defaultProps = {
  fields: [],
};

NonRepeatableComponent.propTypes = {
  fields: PropTypes.array,
  name: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired,
};

export default NonRepeatableComponent;
