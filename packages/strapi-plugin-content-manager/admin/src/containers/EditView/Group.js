import React from 'react';
import PropTypes from 'prop-types';
import { get, omit } from 'lodash';

import Inputs from './Inputs';

function Group({ isRepeatable, label, layout, name, groupValue, onChange }) {
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
          padding: '20px 20px 0px 10px',
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
          <div className="col-12">COMING SOON</div>
        )}
      </div>
    </>
  );
}

Group.defaultProps = {
  groupValue: {},
  label: '',
  layout: {},
  onChange: () => {},
};

Group.propTypes = {
  groupValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  isRepeatable: PropTypes.bool.isRequired,
  label: PropTypes.string,
  layout: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

export default Group;
