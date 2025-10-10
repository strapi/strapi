import * as React from 'react';

import { Flex, Typography } from '@strapi/design-system';
import { PlusCircle as PicturePlus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetSource } from '../../../constants';
import { getTrad, rawFileToAsset } from '../../../utils';

import type { File } from '../../../../../shared/contracts/files';

const TextAlignTypography = styled(Typography)`
  align-items: center;
`;

type FileWithoutIdHash = Omit<File, 'id' | 'hash'>;

interface EmptyStateAssetProps {
  disabled?: boolean;
  onClick: (asset?: File, event?: React.MouseEventHandler<HTMLButtonElement>) => void;
  onDropAsset: (assets: FileWithoutIdHash[]) => void;
}

export const EmptyStateAsset = ({
  disabled = false,
  onClick,
  onDropAsset,
}: EmptyStateAssetProps) => {
  const { formatMessage } = useIntl();
  const [dragOver, setDragOver] = React.useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (e?.dataTransfer?.files) {
      const files = e.dataTransfer.files;
      const assets: FileWithoutIdHash[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
          const asset = rawFileToAsset(file, AssetSource.Computer);

          assets.push(asset);
        }
      }

      onDropAsset(assets);
    }

    setDragOver(false);
  };

  return (
    <Flex
      borderStyle={dragOver ? 'dashed' : undefined}
      borderWidth={dragOver ? '1px' : undefined}
      borderColor={dragOver ? 'primary600' : undefined}
      direction="column"
      justifyContent="center"
      alignItems="center"
      height="100%"
      width="100%"
      tag="button"
      type="button"
      disabled={disabled}
      onClick={onClick as unknown as React.MouseEventHandler<HTMLButtonElement>}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      gap={3}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <PicturePlus
        aria-hidden
        width="3.2rem"
        height="3.2rem"
        fill={disabled ? 'neutral400' : 'primary600'}
      />
      <TextAlignTypography
        variant="pi"
        fontWeight="bold"
        textColor="neutral600"
        style={{ textAlign: 'center' }}
        tag="span"
      >
        {formatMessage({
          id: getTrad('mediaLibraryInput.placeholder'),
          defaultMessage: 'Click to add an asset or drag and drop one in this area',
        })}
      </TextAlignTypography>
    </Flex>
  );
};
