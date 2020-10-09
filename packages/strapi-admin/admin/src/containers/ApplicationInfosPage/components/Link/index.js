import React from 'react';
import { Padded } from '@buffetjs/core';
import PropTypes from 'prop-types';
import BaselineAlignement from '../../../../components/BaselineAlignement';
import A, { LinkArrow } from './A';

const Link = ({ href, label }) => {
  return (
    <Padded top size="smd">
      <BaselineAlignement top size="1px" />
      <A fontWeight="semiBold">
        <a href={href} target="_blank" rel="noopener noreferrer">
          {label}
          <LinkArrow />
        </a>
      </A>
    </Padded>
  );
};

Link.propTypes = {
  href: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

export default Link;
