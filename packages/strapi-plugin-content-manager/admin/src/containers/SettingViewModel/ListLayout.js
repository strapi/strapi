import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import { InputsIndex as Input } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import FormWrapper from '../../components/SettingFormWrapper';

import Add from './Add';
import ListField from './ListField';

function ListLayout({
  addField,
  availableData,
  displayedData,
  fieldToEditIndex,
  modifiedData,
  onChange,
  onClick,
  onRemove,
}) {
  const handleRemove = index => {
    if (displayedData.length > 1) {
      onRemove(index);
      return;
    }

    strapi.notification.info(`${pluginId}.notification.info.minimumFields`);
  };
  const fieldName = displayedData[fieldToEditIndex];
  const fieldPath = ['metadata', fieldName, 'list'];

  const form = [
    {
      label: { id: 'content-manager.form.Input.label' },
      customBootstrapClass: 'col-md-7',
      didCheckErrors: false,
      errors: [],
      inputDescription: {
        id: 'content-manager.form.Input.label.inputDescription',
      },
      name: `${fieldPath.join('.')}.label`,
      type: 'string',
      validations: {},
    },
    {
      label: { id: 'content-manager.form.Input.sort.field' },
      customBootstrapClass: 'col-md-6',
      didCheckErrors: false,
      errors: [],
      name: `${fieldPath.join('.')}.sortable`,
      style: { marginTop: '18px' },
      type: 'toggle',
      validations: {},
    },
  ];
  return (
    <>
      <div className="col-lg-5 col-md-12">
        {displayedData.map((data, index) => (
          <ListField
            key={data}
            index={index}
            isSelected={fieldToEditIndex === index}
            name={data}
            label={get(modifiedData, ['metadata', data, 'list', 'label'], '')}
            onClick={onClick}
            onRemove={handleRemove}
          />
        ))}
        <Add data={availableData} onClick={addField} />
      </div>
      <div className="col-lg-7 col-md-12">
        <FormWrapper>
          {form.map(input => {
            return (
              <Input
                key={input.name}
                {...input}
                onChange={onChange}
                value={get(modifiedData, input.name)}
              />
            );
          })}
        </FormWrapper>
      </div>
    </>
  );
}

ListLayout.defaultProps = {
  addField: () => {},
  availableData: [],
  displayedData: [],
  fieldToEditIndex: 0,
  modifiedData: {},
  onChange: () => {},
  onClick: () => {},
  onRemove: () => {},
};

ListLayout.propTypes = {
  addField: PropTypes.func,
  availableData: PropTypes.array,
  displayedData: PropTypes.array,
  fieldToEditIndex: PropTypes.number,
  modifiedData: PropTypes.object,
  onChange: PropTypes.func,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
};

export default ListLayout;
