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
  id,
  checked,
  children,
  errorMessage,
  hasError,
  mime,
  name,
  onClick,
  small,
  size,
  type,
  url,
}) => {
  const fileSize = formatBytes(size, 0);
  const fileType = mime || type;

  const handleClick = () => {
    onClick(id);
  };

  return (
    <Wrapper onClick={handleClick}>
      <CardImgWrapper checked={checked} small={small}>
        <CardPreview hasError={hasError} url={url} type={fileType} />
        <Border color={hasError ? 'orange' : 'mediumBlue'} shown={checked || hasError} />
        {children}
      </CardImgWrapper>
      <Flex>
        <Title>{name}</Title>
        <Tag label={getType(fileType)} />
      </Flex>
      <Text color="grey" fontSize="xs" ellipsis>
        {`${getExtension(fileType)} - ${fileSize}`}
      </Text>
      {hasError && <ErrorMessage>{errorMessage}</ErrorMessage>}
    </Wrapper>
  );
};

Card.defaultProps = {
  checked: false,
  children: null,
  errorMessage: null,
  id: null,
  hasError: false,
  mime: null,
  name: null,
  onClick: () => {},
  size: 0,
  small: false,
  type: null,
  url: null,
};

Card.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  checked: PropTypes.bool,
  children: PropTypes.node,
  errorMessage: PropTypes.string,
  hasError: PropTypes.bool,
  mime: PropTypes.string,
  name: PropTypes.string,
  onClick: PropTypes.func,
  size: PropTypes.number,
  small: PropTypes.bool,
  type: PropTypes.string,
  url: PropTypes.string,
};

export default Card;
