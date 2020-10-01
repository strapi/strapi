/* eslint-disable react/no-array-index-key */
/* eslint-disable import/no-cycle */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { get, filter } from 'lodash';
import useDataManager from '../../hooks/useDataManager';
import NonRepeatableWrapper from '../NonRepeatableWrapper';
import Inputs from '../Inputs';
import FieldComponent from '../FieldComponent';
import TabsWrapper from './TabsWrapper';

const NonRepeatableComponent = ({
  componentUid,
  fields,
  isFromDynamicZone,
  name,
  schema,
  display,
}) => {
  const { formErrors } = useDataManager();
  const getField = fieldName => get(schema, ['schema', 'attributes', fieldName], {});
  const getMeta = fieldName => get(schema, ['metadatas', fieldName, 'edit'], {});
  const getError = fieldName =>
    filter(
      formErrors,
      (err, fieldErrorKey) =>
        fieldErrorKey === `${name}.${fieldName}` ||
        fieldErrorKey.startsWith(`${name}.${fieldName}.`)
    );

  const [selectedTabIndex, setSelectedTabIndex] = useState('0_0');
  const hasErrors = filter(formErrors, (err, fieldErrorKey) => fieldErrorKey.startsWith(name));

  if (display === 'tabs') {
    return (
      <TabsWrapper className="tabs-container">
        <ul className="tabs">
          {fields.map((fieldRow, key) => {
            return fieldRow.map((field, rowKey) => {
              const metas = getMeta(field.name);
              const error = getError(field.name);

              return (
                <li
                  key={rowKey}
                  className={
                    (selectedTabIndex === `${key}_${rowKey}` ? 'selected' : '') +
                    (error.length !== 0 ? ' has-error' : '')
                  }
                >
                  <button type="button" onClick={() => setSelectedTabIndex(`${key}_${rowKey}`)}>
                    {metas.label}
                  </button>
                </li>
              );
            });
          })}
        </ul>
        <NonRepeatableWrapper className={`wrapper${hasErrors.length !== 0 ? ' has-error' : ''}`}>
          {fields.map((fieldRow, key) => {
            return (
              <div className="row component" key={key}>
                {fieldRow.map((field, rowKey) => {
                  const currentField = getField(field.name);
                  const isComponent = get(currentField, 'type', '') === 'component';
                  const keys = `${name}.${field.name}`;

                  if (isComponent) {
                    const compoUid = currentField.component;
                    const metas = getMeta(field.name);

                    return (
                      <div
                        key={field.name}
                        className={`${
                          selectedTabIndex !== `${key}_${rowKey}` ? 'hidden ' : ''
                        }col-12 sub-wrapper`}
                      >
                        <FieldComponent
                          componentUid={compoUid}
                          isRepeatable={currentField.repeatable}
                          label={metas.label}
                          display={metas.display}
                          max={currentField.max}
                          min={currentField.min}
                          name={keys}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={field.name}
                      className={`${
                        selectedTabIndex !== `${key}_${rowKey}` ? 'hidden ' : ''
                      }col-12`}
                    >
                      <Inputs
                        keys={keys}
                        layout={schema}
                        name={field.name}
                        componentUid={componentUid}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </NonRepeatableWrapper>
      </TabsWrapper>
    );
  }

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
                const compoUid = currentField.component;
                const metas = getMeta(field.name);

                return (
                  <FieldComponent
                    key={field.name}
                    componentUid={compoUid}
                    isRepeatable={currentField.repeatable}
                    label={metas.label}
                    display={metas.display}
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
                    componentUid={componentUid}
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
  display: '',
};

NonRepeatableComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  fields: PropTypes.array,
  isFromDynamicZone: PropTypes.bool,
  name: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired,
  display: PropTypes.string,
};

export default NonRepeatableComponent;
