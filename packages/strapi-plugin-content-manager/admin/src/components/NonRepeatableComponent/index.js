import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import NonRepeatableWrapper from '../NonRepeatableWrapper';
import Inputs from '../Inputs';
import FieldComponent from '../FieldComponent';

const NonRepeatableComponent = ({ fields, name, schema }) => {
  const getField = fieldName =>
    get(schema, ['schema', 'attributes', fieldName], {});
  const getMeta = fieldName =>
    get(schema, ['metadatas', fieldName, 'edit'], {});

  return (
    <NonRepeatableWrapper>
      {fields.map((fieldRow, key) => {
        return (
          <div className="row" key={key}>
            {fieldRow.map(field => {
              const currentField = getField(field.name);
              const isComponent = get(currentField, 'type', '') === 'component';
              const keys = `${name}.${field.name}`;

              if (isComponent) {
                const componentUid = currentField.component;
                const metas = getMeta(field.name);

                return (
                  <FieldComponent
                    key={field.name}
                    name={keys}
                    label={metas.label}
                    componentUid={componentUid}
                  />
                );
              }

              return (
                <div key={field.name} className={`col-${field.size}`}>
                  <Inputs
                    autoFocus={false}
                    keys={keys}
                    layout={schema}
                    name={field.name}
                    onChange={() => {}}
                  />
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
