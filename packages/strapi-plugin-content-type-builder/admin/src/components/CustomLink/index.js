import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';

import StyledCustomLink from './StyledCustomLink';

const CustomLink = ({ onClick }) => (
  <StyledCustomLink>
    <button onClick={onClick} role="button">
      <p>
        <i className="fa fa-plus" />
        <FormattedMessage id={`${pluginId}.button.contentType.add`} />
      </p>
    </button>
  </StyledCustomLink>
);

CustomLink.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default CustomLink;
