import React from 'react';
import { Padded, Text } from '@buffetjs/core';
import PropTypes from 'prop-types';

const InfoText = ({ content }) => {
  return (
    <Padded top size="xs">
      <Text fontWeight="semiBold" lineHeight="13px">
        {content}
      </Text>
    </Padded>
  );
};

InfoText.propTypes = {
  content: PropTypes.string.isRequired,
};

export default InfoText;
