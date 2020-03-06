import React from 'react';
import PropTypes from 'prop-types';

import Text from '../Text';
import CardImgWrapper from '../CardImgWrapper';
import CardPreview from '../CardPreview';
import Wrapper from './Wrapper';
import Title from './Title';

// TODO - adapt with the real data
const Card = ({
  checked,
  children,
  errorMessage,
  hasError,
  mime,
  name,
  onChange,
  small,
  size,
  type,
  url,
}) => {
  return (
    <Wrapper>
      <div>
        <CardImgWrapper small={small} checked={checked} hasError={hasError}>
          <CardPreview type={mime || type} url={url} />
          {children}
        </CardImgWrapper>
        <Title fontSize="md" fontWeight="bold" ellipsis>
          {name}
        </Title>
        {!hasError && <Text color="grey" fontSize="xs" ellipsis>{`${type} - ${size}`}</Text>}
        {hasError && <p style={{ marginBottom: 14 }}>{errorMessage}</p>}
      </div>
    </Wrapper>
  );
};

Card.defaultProps = {
  checked: false,
  children: null,
  hasError: false,
  name: null,
  onChange: () => {},
  size: 0,
  small: false,
  type: null,
  url: null,
};

Card.propTypes = {
  checked: PropTypes.bool,
  children: PropTypes.node,
  hasError: PropTypes.bool,
  name: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func,
  size: PropTypes.number,
  small: PropTypes.bool,
  type: PropTypes.string,
  url: PropTypes.string,
};

export default Card;
