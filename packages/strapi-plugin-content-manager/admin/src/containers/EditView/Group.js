import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, omit } from 'lodash';
import pluginId from '../../pluginId';

import { Button } from './components';
import GroupCollapse from './GroupCollapse';
import Inputs from './Inputs';

function Group({
  addField,
  isRepeatable,
  label,
  layout,
  // min,
  max,
  name,
  groupValue,
  onChange,
  removeField,
}) {
  const fields = get(layout, ['layouts', 'edit'], []);

  return (
    <>
      <div className="row">
        <div className="col-12" style={{ paddingTop: 16, paddingBottom: 15 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        </div>
      </div>
      <div
        className="row"
        style={{
          marginLeft: '-10px',
          marginRight: '-10px',
          backgroundColor: '#f5f5f5',
          padding: '0 20px 10px 10px',
          paddingTop: isRepeatable ? '13px' : '20px',
        }}
      >
        {!isRepeatable ? (
          <div className="col-12">
            {fields.map((fieldRow, key) => {
              return (
                <div className="row" key={key}>
                  {fieldRow.map(field => {
                    //
                    const attribute = get(
                      layout,
                      ['schema', 'attributes', field.name],
                      {}
                    );
                    const { model, collection } = attribute;
                    const isMedia =
                      get(attribute, 'plugin', '') === 'upload' &&
                      (model || collection) === 'file';
                    const multiple = collection == 'file';
                    const metadata = get(
                      layout,
                      ['metadata', field.name, 'edit'],
                      {}
                    );
                    const type = isMedia
                      ? 'file'
                      : get(attribute, 'type', null);
                    const inputStyle =
                      type === 'text' ? { height: '196px' } : {};
                    const validations = omit(attribute, [
                      'type',
                      'model',
                      'via',
                      'collection',
                      'default',
                      'plugin',
                      'enum',
                    ]);
                    const value = get(groupValue, field.name);
                    const { description, visible } = metadata;

                    // Remove the updatedAt fields
                    if (visible === false) {
                      return null;
                    }

                    return (
                      <Inputs
                        {...metadata}
                        inputDescription={description}
                        inputStyle={inputStyle}
                        multiple={multiple}
                        key={`${name}.${field.name}`}
                        name={`${name}.${field.name}`}
                        onChange={onChange}
                        selectOptions={get(attribute, 'enum', [])}
                        type={type}
                        validations={validations}
                        value={value}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="col-12">
            <div className="row">
              {groupValue.map((field, index) => {
                //

                return (
                  <div className="col-12" key={index}>
                    <GroupCollapse
                      removeField={() => removeField(`${name}.${index}`)}
                      groupName={name}
                    />
                  </div>
                );
              })}
              <div className="col-12">
                <Button
                  onClick={() => {
                    if (groupValue.length < max) {
                      addField(name);
                      return;
                    }

                    strapi.notification.info(
                      'You have already reached the maximum'
                    );
                  }}
                >
                  <i className="fa fa-plus" />
                  <FormattedMessage
                    id={`${pluginId}.containers.EditView.Group.add.new`}
                  />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

Group.defaultProps = {
  groupValue: {},
  label: '',
  layout: {},
  max: Infinity,
  onChange: () => {},
};

Group.propTypes = {
  addField: PropTypes.func.isRequired,
  groupValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  isRepeatable: PropTypes.bool.isRequired,
  label: PropTypes.string,
  layout: PropTypes.object,
  max: PropTypes.number,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  removeField: PropTypes.func.isRequired,
};

export default Group;
