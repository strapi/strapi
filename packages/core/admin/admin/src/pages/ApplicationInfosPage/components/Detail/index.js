import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';
import InfoText from '../InfoText';
import Link from '../Link';
import Wrapper from '../Wrapper';

const Detail = ({ content, link, title }) => {
  return (
    <Wrapper>
      <Text fontSize="xs" color="grey" fontWeight="bold">
        {title}
      </Text>
      <InfoText content={content} />
      {link && <Link {...link} />}
    </Wrapper>
  );
};

Detail.defaultProps = {
  link: null,
};

Detail.propTypes = {
  content: PropTypes.string.isRequired,
  link: PropTypes.object,
  title: PropTypes.string.isRequired,
};

export default Detail;
