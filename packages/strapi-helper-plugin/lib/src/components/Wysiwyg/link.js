/**
 *
 * Link
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { includes } from 'lodash';

const Link = props => {
  const { url, aHref, aInnerHTML } = props.contentState.getEntity(props.entityKey).getData();
  let content = aInnerHTML;

  if (includes(aInnerHTML, '<img', 'src=')) {
    const src = aInnerHTML.split('src="')[1].split('" ')[0];
    const width = includes(aInnerHTML, 'width=') ? aInnerHTML.split('width="')[1].split('" ')[0] : '';
    const height = includes(aInnerHTML, 'height=') ? aInnerHTML.split('height="')[1].split('" ')[0] : '';
    content = <img src={src} alt="img" width={width} height={height} style={{ marginTop: '27px', maxWidth: '100%' }} />;
  }

  return (
    <a
      href={url || aHref}
      onClick={() => {
        window.open(url || aHref, '_blank');
      }}
      style={{ cursor: 'pointer' }}
    >
      {content || props.children}
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
