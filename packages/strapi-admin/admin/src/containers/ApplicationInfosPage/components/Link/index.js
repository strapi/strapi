import React from 'react';
import { Padded } from '@buffetjs/core';
import PropTypes from 'prop-types';
import { BaselineAlignment } from 'strapi-helper-plugin';
import LinkText, { LinkArrow } from './components';

const Link = ({ href, label }) => {
  return (
    <Padded top size="smd">
      <BaselineAlignment top size="1px" />
      <LinkText fontWeight="semiBold">
        <a href={href} target="_blank" rel="noopener noreferrer">
          {label}
          <LinkArrow />
        </a>
      </LinkText>
    </Padded>
  );
};

Link.propTypes = {
  href: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

export default Link;
