/**
 *
 * LiLink
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isObject } from 'lodash';
import StyledLink from './StyledLink';

function LiLink(props) {
  let content;

  if (typeof props.message === 'string') {
    content = props.message;
  } else if (isObject(props.message) && props.message.id) {
    content = <FormattedMessage id={props.message.id} />;
  } else {
    // Default value.
    content = props.children;
  }

  let icon = <i className={`fa ${props.icon}`} />;

  if (props.icon === 'layout') {
    icon = <i className="layout" />;
  }

  return (
    <li>
      <StyledLink to={props.url} onClick={props.onClick}>
        {icon}
        {content}
      </StyledLink>
    </li>
  );
}

LiLink.defaultProps = {
  children: '',
  icon: '',
  message: '',
  onClick: () => {},
  url: '',
};

LiLink.propTypes = {
  children: PropTypes.node,
  icon: PropTypes.string,
  message: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.string,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  onClick: PropTypes.func,
  url: PropTypes.string,
};

export default LiLink;
