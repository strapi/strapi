import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Collapse } from 'reactstrap';
import useDataManager from '../../hooks/useDataManager';
import Inputs from '../Inputs';
import FieldComponent from '../FieldComponent';
import Banner from './Banner';
import FormWrapper from './FormWrapper';

const DraggedItem = ({
  componentFieldName,
  fields,
  isOpen,
  onClickToggle,
  removeCollapse,
  schema,
}) => {
  const { modifiedData, removeRepeatableField } = useDataManager();
  const mainField = get(schema, ['settings', 'mainField'], 'id');
  const displayedValue = get(
    modifiedData,
    [...componentFieldName.split('.'), mainField],
    null
  );
  const getField = fieldName =>
    get(schema, ['schema', 'attributes', fieldName], {});
  const getMeta = fieldName =>
    get(schema, ['metadatas', fieldName, 'edit'], {});

  return (
    <>
      <Banner
        componentFieldName={componentFieldName}
        displayedValue={displayedValue}
        isOpen={isOpen}
        onClickToggle={onClickToggle}
        onClickRemove={() => {
          removeRepeatableField(componentFieldName);
          removeCollapse();
        }}
      />
      <Collapse isOpen={isOpen} style={{ backgroundColor: '#FAFAFB' }}>
        <FormWrapper isOpen={isOpen}>
          {fields.map((fieldRow, key) => {
            return (
              <div className="row" key={key}>
                {fieldRow.map(field => {
                  const currentField = getField(field.name);
                  const isComponent =
                    get(currentField, 'type', '') === 'component';
                  const keys = `${componentFieldName}.${field.name}`;

                  if (isComponent) {
                    const componentUid = currentField.component;
                    const metas = getMeta(field.name);

                    return (
                      <FieldComponent
                        componentUid={componentUid}
                        isRepeatable={currentField.repeatable}
                        key={field.name}
                        label={metas.label}
                        name={keys}
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
        </FormWrapper>
      </Collapse>
    </>
  );
};

DraggedItem.defaultProps = {
  fields: [],
  isOpen: false,
};

DraggedItem.propTypes = {
  componentFieldName: PropTypes.string.isRequired,
  fields: PropTypes.array,
  isOpen: PropTypes.bool,
  onClickToggle: PropTypes.func.isRequired,
  removeCollapse: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
};

export default DraggedItem;
