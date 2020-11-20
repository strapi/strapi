/* eslint-disable react/no-array-index-key */
/* eslint-disable import/no-cycle */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useContentTypeLayout } from '../../hooks';
import NonRepeatableWrapper from '../NonRepeatableWrapper';
import Inputs from '../Inputs';
import FieldComponent from '../FieldComponent';

const NonRepeatableComponent = ({ componentUid, isFromDynamicZone, name }) => {
  const { getComponentLayout } = useContentTypeLayout();
  const componentLayoutData = useMemo(() => getComponentLayout(componentUid), [
    componentUid,
    getComponentLayout,
  ]);
  const fields = componentLayoutData.layouts.edit;

  return (
    <NonRepeatableWrapper isFromDynamicZone={isFromDynamicZone}>
      {fields.map((fieldRow, key) => {
        return (
          <div className="row" key={key}>
            {fieldRow.map(({ name: fieldName, size, metadatas, fieldSchema, queryInfos }) => {
              const isComponent = fieldSchema.type === 'component';
              const keys = `${name}.${fieldName}`;

              if (isComponent) {
                const compoUid = fieldSchema.component;

                return (
                  <FieldComponent
                    key={fieldName}
                    componentUid={compoUid}
                    isRepeatable={fieldSchema.repeatable}
                    label={metadatas.label}
                    max={fieldSchema.max}
                    min={fieldSchema.min}
                    name={keys}
                  />
                );
              }

              return (
                <div key={fieldName} className={`col-${size}`}>
                  <Inputs
                    keys={keys}
                    fieldSchema={fieldSchema}
                    metadatas={metadatas}
                    componentUid={componentUid}
                    queryInfos={queryInfos}
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
  isFromDynamicZone: false,
};

NonRepeatableComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  isFromDynamicZone: PropTypes.bool,
  name: PropTypes.string.isRequired,
};

export default NonRepeatableComponent;
