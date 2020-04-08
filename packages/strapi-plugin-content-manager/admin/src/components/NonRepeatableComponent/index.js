/* eslint-disable react/no-array-index-key */
/* eslint-disable import/no-cycle */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import NonRepeatableWrapper from '../NonRepeatableWrapper';
import Inputs from '../Inputs';
import FieldComponent from '../FieldComponent';

const NonRepeatableComponent = ({
  fields,
  isFromDynamicZone,
  name,
  schema,
}) => {
  const getField = fieldName =>
    get(schema, ['schema', 'attributes', fieldName], {});
  const getMeta = fieldName =>
    get(schema, ['metadatas', fieldName, 'edit'], {});

  return (
    <NonRepeatableWrapper isFromDynamicZone={isFromDynamicZone}>
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
                    componentUid={componentUid}
                    isRepeatable={currentField.repeatable}
                    label={metas.label}
                    max={currentField.max}
                    min={currentField.min}
                    name={keys}
                  />
                );
              }

              return (
                <div key={field.name} className={`col-${field.size}`}>
                  <Inputs
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
  isFromDynamicZone: false,
};

NonRepeatableComponent.propTypes = {
  fields: PropTypes.array,
  isFromDynamicZone: PropTypes.bool,
  name: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired,
};

export default NonRepeatableComponent;
