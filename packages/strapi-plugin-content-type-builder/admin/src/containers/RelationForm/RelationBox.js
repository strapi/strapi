import React from 'react';
import PropTypes from 'prop-types';

import { InputTextWithErrors as InputText } from 'strapi-helper-plugin';

import ModelPicker from './ModelPicker';
import RelationBoxWrapper from './RelationBoxWrapper';

/* istanbul ignore next */
const RelationBox = ({
  autoFocus,
  didCheckErrors,
  errors,
  main,
  models,
  modelName,
  nature,
  onChange,
  onClick,
  selectedModel,
  plugin,
  source,
  value,
}) => {
  return (
    <RelationBoxWrapper>
      <div className="relationBox">
        <div className="relationBoxHeader">
          {main ? (
            <p>
              <i className="fa fa-caret-square-o-right" />
              {modelName}
              {!!source && (
                <span style={{ fontStyle: 'italic', fontWeight: '500' }}>
                  &nbsp;({source})
                </span>
              )}
            </p>
          ) : (
            <ModelPicker
              models={models}
              onClick={onClick}
              plugin={plugin}
              selectedModel={selectedModel}
            />
          )}
        </div>
        <div className="relationBoxBody">
          <InputText
            autoFocus={autoFocus}
            didCheckErrors={didCheckErrors}
            errors={errors}
            label="Field Name"
            disabled={
              value === '-' || nature === 'oneWay' || nature === 'manyWay'
            }
            name={main ? 'name' : 'key'}
            onChange={onChange}
            type="text"
            value={nature === 'oneWay' || nature === 'manyWay' ? '-' : value}
          />
        </div>
      </div>
    </RelationBoxWrapper>
  );
};

RelationBox.defaultProps = {
  autoFocus: false,
  didCheckErrors: false,
  errors: [],
  main: false,
  modelName: '',
  models: [],
  nature: null,
  onClick: () => {},
  plugin: null,
  selectedModel: null,
  source: null,
};

RelationBox.propTypes = {
  autoFocus: PropTypes.bool,
  didCheckErrors: PropTypes.bool,
  errors: PropTypes.array,
  main: PropTypes.bool,
  modelName: PropTypes.string,
  models: PropTypes.array,
  nature: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  plugin: PropTypes.string,
  selectedModel: PropTypes.string,
  source: PropTypes.string,
  value: PropTypes.string.isRequired,
};

export default RelationBox;
