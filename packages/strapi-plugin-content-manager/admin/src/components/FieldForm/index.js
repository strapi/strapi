import React, { memo } from 'react';
import PropTypes from 'prop-types';

import { InputsIndex as Input } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import SettingFormWrapper from '../SettingFormWrapper';

const getInputProps = fieldName => {
  let type;

  switch (fieldName) {
    case 'description':
    case 'label':
    case 'placeholder':
      type = 'text';
      break;
    case 'mainField':
      type = 'select';
      break;
    case 'editable':
      type = 'toggle';
      break;
    default:
      type = '';
  }

  const labelId =
    fieldName === 'mainField'
      ? `${pluginId}.containers.SettingPage.editSettings.entry.title`
      : `${pluginId}.form.Input.${fieldName}`;

  return { type, label: { id: labelId } };
};

const FieldForm = ({
  className,
  fieldName,
  formType,
  metadatas,
  onChange,
  selectOptions,
}) => {
  return (
    <div className={className}>
      <SettingFormWrapper style={{ marginTop: '3px' }}>
        <div className="row">
          {Object.keys(metadatas)
            .filter(meta => meta !== 'visible')
            .map(meta => {
              if (
                (formType === 'group' || formType === 'media') &&
                meta !== 'label'
              ) {
                return null;
              }

              if (
                (formType === 'json' || formType === 'boolean') &&
                meta === 'placeholder'
              ) {
                return null;
              }

              if (formType === 'richtext' && meta === 'editable') {
                return null;
              }

              return (
                <Input
                  inputDescription={
                    meta === 'mainField'
                      ? {
                          id: `${pluginId}.containers.SettingPage.editSettings.entry.title.description`,
                        }
                      : ''
                  }
                  label={getInputProps(meta).label}
                  key={meta}
                  name={`metadatas.${fieldName}.edit.${meta}`}
                  onChange={onChange}
                  selectOptions={selectOptions}
                  value={metadatas[meta]}
                  type={getInputProps(meta).type}
                />
              );
            })}
        </div>
      </SettingFormWrapper>
    </div>
  );
};

FieldForm.defaultProps = {
  className: 'col-8',
  metadatas: {},
  onChange: () => {},
  selectOptions: [],
};

FieldForm.propTypes = {
  className: PropTypes.string,
  fieldName: PropTypes.string.isRequired,
  formType: PropTypes.string.isRequired,
  metadatas: PropTypes.object,
  onChange: PropTypes.func,
  selectOptions: PropTypes.array,
};

export default memo(FieldForm);
export { FieldForm, getInputProps };
