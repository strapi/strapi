import React from 'react';
import PropTypes from 'prop-types';
import { InputTextWithErrors as InputText } from 'strapi-helper-plugin';

import StyledRelationBox from './StyledRelationBox';
import FeaturePicker from '../FeaturePicker';

const RelationBox = ({
  autoFocus,
  didCheckErrors,
  errors,
  featureName,
  features,
  main,
  nature,
  onChange,
  selectedFeature,
  source,
  plugin,
  value,
}) => {
  return (
    <StyledRelationBox>
      <div className="box-header">
        {main ? (
          <p>
            <i className="fa fa-caret-square-o-right" />
            {featureName}
            {!!source && <span>&nbsp;({source})</span>}
          </p>
        ) : (
          <FeaturePicker
            features={features}
            plugin={plugin}
            selectedFeature={selectedFeature}
          ></FeaturePicker>
        )}
      </div>

      <div className="box-body">
        <InputText
          autoFocus={autoFocus}
          didCheckErrors={didCheckErrors}
          errors={errors}
          label="Field Name"
          disabled={value === '-' || nature === 'oneWay'}
          name={main ? 'name' : 'key'}
          onChange={onChange}
          type="text"
          value={nature === 'oneWay' ? '-' : value}
        />
      </div>
    </StyledRelationBox>
  );
};

RelationBox.defaultProps = {
  autoFocus: false,
  didCheckErrors: false,
  errors: [],
  main: false,
  featureName: '',
  features: [],
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
  featureName: PropTypes.string,
  features: PropTypes.array,
  nature: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  plugin: PropTypes.string,
  selectedModel: PropTypes.string,
  source: PropTypes.string,
  value: PropTypes.string.isRequired,
};

export default RelationBox;
