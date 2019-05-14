/**
 *
 * LiLink
 *
 */

import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isObject } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

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
    icon = <i className={cn(styles.layout)} />;
  }

  return (
    <li>
      <Link to={props.url} className={cn(styles.navLink)}>
        {icon}
        {content}
      </Link>
    </li>
  );
}

LiLink.defaultProps = {
  children: '',
  icon: '',
  message: '',
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
  url: PropTypes.string,
};

export default LiLink;
