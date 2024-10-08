import React from 'react';

import { Flex } from '@strapi/design-system';
import { File, FilePdf } from '@strapi/icons';
import PropTypes from 'prop-types';
import { styled } from 'styled-components';

import { AssetCardBase } from './AssetCardBase';

const IconWrapper = styled.span`
  svg {
    font-size: 4.8rem;
  }
`;

const CardAsset = styled(Flex)`
  border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
  background: linear-gradient(180deg, #ffffff 0%, #f6f6f9 121.48%);
`;

export const DocAssetCard = ({ name, extension, size, ...restProps }) => {
  return (
    <AssetCardBase name={name} extension={extension} {...restProps} variant="Doc">
      <CardAsset width="100%" height={size === 'S' ? `8.8rem` : `16.4rem`} justifyContent="center">
        <IconWrapper>
          {extension === 'pdf' ? <FilePdf aria-label={name} /> : <File aria-label={name} />}
        </IconWrapper>
      </CardAsset>
    </AssetCardBase>
  );
};

DocAssetCard.defaultProps = {
  selected: false,
  onEdit: undefined,
  onSelect: undefined,
  onRemove: undefined,
  size: 'M',
};

DocAssetCard.propTypes = {
  extension: PropTypes.string.isRequired,
  onEdit: PropTypes.func,
  onSelect: PropTypes.func,
  onRemove: PropTypes.func,
  selected: PropTypes.bool,
  name: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['S', 'M']),
};
