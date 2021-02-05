/**
 *
 * ListView
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import Wrapper from './Wrapper';

function EmptyList({ title, description, link, linkText }) {
  return (
    <Wrapper>
      <p>{title}</p>
      <p>{description}</p>
      {link && linkText && (
        <a href={link} target="_blank" rel="noopener noreferrer">
          {linkText}
        </a>
      )}
    </Wrapper>
  );
}

EmptyList.defaultProps = {
  link: undefined,
  linkText: undefined,
};

EmptyList.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  link: PropTypes.string,
  linkText: PropTypes.string,
};

export default EmptyList;
