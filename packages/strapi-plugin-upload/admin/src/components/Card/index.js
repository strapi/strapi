import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { formatBytes, getExtension, getType } from '../../utils';

import Flex from '../Flex';
import Text from '../Text';
import Border from '../CardBorder';
import CardImgWrapper from '../CardImgWrapper';
import CardPreview from '../CardPreview';
import ErrorMessage from '../CardErrorMessage';
import Title from '../CardTitle';
import Tag from '../Tag';
import Wrapper from '../CardWrapper';

const Card = ({
  id,
  checked,
  children,
  errorMessage,
  hasError,
  hasIcon,
  mime,
  name,
  onClick,
  previewUrl,
  small,
  size,
  type,
  url,
  withFileCaching,
  withoutFileInfo,
}) => {
  const fileSize = formatBytes(size, 0);
  const fileType = mime || type;

  const handleClick = () => {
    onClick(id);
  };

  return (
    <Wrapper onClick={handleClick}>
      <CardImgWrapper checked={checked} small={small}>
        <CardPreview
          hasError={hasError}
          hasIcon={hasIcon}
          previewUrl={previewUrl}
          url={url}
          type={fileType}
          withFileCaching={withFileCaching}
        />
        <Border color={hasError ? 'orange' : 'mediumBlue'} shown={checked || hasError} />
        {children}
      </CardImgWrapper>

      {!withoutFileInfo ? (
        <>
          <Flex>
            <Title>{name}</Title>
            <Tag label={getType(fileType)} />
          </Flex>
          <Text color="grey" fontSize="xs" ellipsis>
            {!withoutFileInfo && `${getExtension(fileType)} - ${fileSize}`}
          </Text>
        </>
      ) : (
        <Text lineHeight="13px" />
      )}

      {hasError && <ErrorMessage title={errorMessage}>{errorMessage}</ErrorMessage>}
    </Wrapper>
  );
};

Card.defaultProps = {
  checked: false,
  children: null,
  errorMessage: null,
  id: null,
  hasError: false,
  hasIcon: false,
  mime: null,
  name: null,
  onClick: () => {},
  previewUrl: null,
  size: 0,
  small: false,
  type: null,
  url: null,
  withFileCaching: true,
  withoutFileInfo: false,
};

Card.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  checked: PropTypes.bool,
  children: PropTypes.node,
  errorMessage: PropTypes.string,
  hasError: PropTypes.bool,
  hasIcon: PropTypes.bool,
  mime: PropTypes.string,
  name: PropTypes.string,
  onClick: PropTypes.func,
  previewUrl: PropTypes.string,
  size: PropTypes.number,
  small: PropTypes.bool,
  type: PropTypes.string,
  url: PropTypes.string,
  withFileCaching: PropTypes.bool,
  withoutFileInfo: PropTypes.bool,
};

export default memo(Card);
