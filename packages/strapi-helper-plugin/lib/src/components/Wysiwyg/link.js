/**
 *
 * Link
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

const Link = props => {
  const { url } = props.contentState.getEntity(props.entityKey).getData();

  return (
    <a href={url}>
      {props.children}
    </a>
  );
};

Link.defaultProps = {
  children: '',
};

Link.propTypes = {
  children: PropTypes.node,
  contentState: PropTypes.object.isRequired,
  entityKey: PropTypes.string.isRequired,
};

export default Link;
