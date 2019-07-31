import React from 'react';
import PropTypes from 'prop-types';

import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from 'reactstrap';

import StyledFeaturePicker from './StyledFeaturePicker';

const FeaturePicker = ({ features, onClick, plugin, selectedFeature }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <StyledFeaturePicker>
      <Dropdown
        isOpen={isOpen}
        toggle={() => {
          setIsOpen(!isOpen);
        }}
      >
        <DropdownToggle caret>
          <p>
            <i className="fa fa-caret-square-o-right" />
            {selectedFeature}
            {!!plugin && <span>&nbsp;({plugin})</span>}
          </p>
        </DropdownToggle>
        <DropdownMenu>
          {features.map(feature => {
            return (
              <DropdownItem key={feature.name} onClick={() => onClick(feature)}>
                <p>
                  <i className="fa fa-caret-square-o-right" />
                  {feature.name}
                  {!!feature.source && <span>&nbsp;({feature.source})</span>}
                </p>
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
    </StyledFeaturePicker>
  );
};

FeaturePicker.defaultProps = {
  features: [],
  onClick: () => {},
  plugin: null,
  selectedFeature: '',
};

FeaturePicker.propTypes = {
  features: PropTypes.array,
  onClick: PropTypes.func,
  plugin: PropTypes.string,
  selectedFeature: PropTypes.string,
};

export default FeaturePicker;
