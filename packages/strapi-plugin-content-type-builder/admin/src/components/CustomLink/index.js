import React, { memo } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

import StyledCustomLink from './StyledCustomLink';

const CustomLink = ({ id, onClick }) => (
  <StyledCustomLink>
    <button onClick={onClick} role="button">
      <p>
        <i className="fa fa-plus" />
        {id && <FormattedMessage id={id} />}
      </p>
    </button>
  </StyledCustomLink>
);

CustomLink.defaultProps = {
  id: null,
};

CustomLink.propTypes = {
  id: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

export default memo(CustomLink);
export { CustomLink };
