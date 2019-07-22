import React from 'react';
import PropTypes from 'prop-types';

import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from 'reactstrap';

import StyledFeaturePicker from './StyledFeaturePicker';

const FeaturePicker = ({ features, onClick, plugin, selectFeature }) => {
  const [isOpen, setOpen] = React.useState(false);
  console.log(selectFeature);
  return (
    <StyledFeaturePicker>
      <Dropdown
        isOpen={isOpen}
        toggle={() => {
          setOpen(!isOpen);
        }}
      >
        <DropdownToggle caret>
          <p>
            <i className="fa fa-caret-square-o-right" />
            {selectFeature}
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
                  {!!feature.source && (
                    <span style={{ fontStyle: 'italic' }}>
                      &nbsp;({feature.source})
                    </span>
                  )}
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
  selectFeature: '',
};

FeaturePicker.propTypes = {
  features: PropTypes.array,
  onClick: PropTypes.func,
  plugin: PropTypes.string,
  selectFeature: PropTypes.string,
};

export default FeaturePicker;
