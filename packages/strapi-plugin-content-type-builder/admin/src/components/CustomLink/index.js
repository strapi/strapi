import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';

import StyledCustomLink from './StyledCustomLink';

const CustomLink = ({ onClick, featureType }) => (
  <StyledCustomLink>
    <button onClick={onClick} role="button">
      <p>
        <i className="fa fa-plus" />
        <FormattedMessage id={`${pluginId}.button.${featureType}.add`} />
      </p>
    </button>
  </StyledCustomLink>
);

CustomLink.propTypes = {
  featureType: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default CustomLink;
