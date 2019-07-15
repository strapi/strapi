import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';

import StyledCustomLink from './StyledCustomLink';

const CustomLink = ({ featureType, onClick }) => (
  <StyledCustomLink>
    <button onClick={onClick} role="button">
      <p>
        <i className="fa fa-plus" />
        <FormattedMessage id={`${pluginId}.button.${featureType}.add`} />
      </p>
    </button>
  </StyledCustomLink>
);

CustomLink.defaultProps = {
  featureType: 'model',
};

CustomLink.propTypes = {
  featureType: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

export default CustomLink;
