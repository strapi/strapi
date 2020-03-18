import React from 'react';
import PropTypes from 'prop-types';

import { formatBytes, getExtension, getType } from '../../utils';

import Flex from '../Flex';
import Text from '../Text';
import CardImgWrapper from '../CardImgWrapper';
import CardPreview from '../CardPreview';
import Tag from '../Tag';
import Wrapper from './Wrapper';
import Title from './Title';
import ErrorMessage from './ErrorMessage';
import Border from './Border';

const Card = ({
  checked,
  children,
  errorMessage,
  hasError,
  mime,
  name,
  small,
  size,
  type,
  url,
}) => {
  const getFileSize = () => {
    return formatBytes(size, 0);
  };

  const getFileType = () => {
    return mime || type;
  };

  return (
    <Wrapper>
      <CardImgWrapper checked={checked} small={small}>
        <CardPreview hasError={hasError} url={url} type={getFileType()} />
        <Border color={hasError ? 'orange' : 'mediumBlue'} shown={checked || hasError} />
        {children}
      </CardImgWrapper>
      <Flex>
        <Title>{name}</Title>
        <Tag label={getType(getFileType())} />
      </Flex>
      <Text color="grey" fontSize="xs" ellipsis>
        {`${getExtension(getFileType())} - ${getFileSize()}`}
      </Text>
      {hasError && <ErrorMessage>{errorMessage}</ErrorMessage>}
    </Wrapper>
  );
};

Card.defaultProps = {
  checked: false,
  children: null,
  errorMessage: null,
  hasError: false,
  mime: null,
  name: null,
  size: 0,
  small: false,
  type: null,
  url: null,
};

Card.propTypes = {
  checked: PropTypes.bool,
  children: PropTypes.node,
  errorMessage: PropTypes.string,
  hasError: PropTypes.bool,
  mime: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.number,
  small: PropTypes.bool,
  type: PropTypes.string,
  url: PropTypes.string,
};

export default Card;
