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
  onClick,
  plugin,
  selectedFeature,
  source,
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
            onClick={onClick}
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
          disabled={
            value === '-' || nature === 'oneWay' || nature === 'manyWays'
          }
          name={main ? 'name' : 'key'}
          onChange={onChange}
          type="text"
          value={nature === 'oneWay' || nature === 'manyWays' ? '-' : value}
        />
      </div>
    </StyledRelationBox>
  );
};

RelationBox.defaultProps = {
  autoFocus: false,
  didCheckErrors: false,
  errors: [],
  featureName: '',
  features: [],
  main: false,
  nature: null,
  onClick: () => {},
  plugin: null,
  selectedFeature: null,
  source: null,
};

RelationBox.propTypes = {
  autoFocus: PropTypes.bool,
  didCheckErrors: PropTypes.bool,
  errors: PropTypes.array,
  featureName: PropTypes.string,
  features: PropTypes.array,
  main: PropTypes.bool,
  nature: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  plugin: PropTypes.string,
  selectedFeature: PropTypes.string,
  source: PropTypes.string,
  value: PropTypes.string.isRequired,
};

export default RelationBox;
