import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { getFileExtension, useGlobalContext } from 'strapi-helper-plugin';
import { formatBytes, getType, getTrad } from '../../utils';

import Flex from '../Flex';
import Text from '../Text';
import Border from '../CardBorder';
import CardImgWrapper from '../CardImgWrapper';
import CardPreview from '../CardPreview';
import ErrorMessage from '../CardErrorMessage';
import FileInfos from '../FileInfos';
import Title from '../CardTitle';
import Tag from '../Tag';
import Wrapper from '../CardWrapper';

const Card = ({
  id,
  isDisabled,
  checked,
  children,
  errorMessage,
  ext,
  hasError,
  height,
  mime,
  name,
  onClick,
  previewUrl,
  small,
  size,
  type,
  url,
  width,
  withFileCaching,
  withoutFileInfo,
}) => {
  const { formatMessage } = useGlobalContext();
  const fileSize = formatBytes(size, 0);
  const fileType = mime || type;
  const generatedExtension =
    !ext && name.lastIndexOf('.') !== -1
      ? name.substr(name.lastIndexOf('.') + 1, name.length)
      : getFileExtension(ext);

  const handleClick = () => {
    if (!isDisabled || checked) {
      onClick(id);
    }
  };

  return (
    <Wrapper
      title={isDisabled ? formatMessage({ id: getTrad('list.assets.type-not-allowed') }) : null}
      onClick={handleClick}
    >
      <CardImgWrapper checked={checked} small={small}>
        <CardPreview
          extension={generatedExtension}
          hasError={hasError}
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
          {!withoutFileInfo && (
            <FileInfos
              extension={generatedExtension}
              size={fileSize}
              width={width}
              height={height}
            />
          )}
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
  ext: null,
  id: null,
  isDisabled: false,
  hasError: false,
  height: null,
  mime: null,
  name: null,
  onClick: () => {},
  previewUrl: null,
  size: 0,
  small: false,
  type: null,
  url: null,
  width: null,
  withFileCaching: true,
  withoutFileInfo: false,
};

Card.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isDisabled: PropTypes.bool,
  checked: PropTypes.bool,
  children: PropTypes.node,
  errorMessage: PropTypes.string,
  ext: PropTypes.string,
  hasError: PropTypes.bool,
  height: PropTypes.number,
  mime: PropTypes.string,
  name: PropTypes.string,
  onClick: PropTypes.func,
  previewUrl: PropTypes.string,
  size: PropTypes.number,
  small: PropTypes.bool,
  type: PropTypes.string,
  url: PropTypes.string,
  width: PropTypes.number,
  withFileCaching: PropTypes.bool,
  withoutFileInfo: PropTypes.bool,
};

export default memo(Card);
