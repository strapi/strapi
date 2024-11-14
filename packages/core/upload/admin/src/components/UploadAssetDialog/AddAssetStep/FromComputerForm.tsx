import * as React from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import { Box, Button, Flex, Modal, Typography } from '@strapi/design-system';
import { PlusCircle as PicturePlus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetSource } from '../../../constants';
import { getTrad, rawFileToAsset } from '../../../utils';

import type { FileWithRawFile } from './AddAssetStep';

const Wrapper = styled(Flex)`
  flex-direction: column;
`;

const IconWrapper = styled.div`
  font-size: 6rem;

  svg path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

const MediaBox = styled(Box)`
  border-style: dashed;
`;

const OpaqueBox = styled(Box)`
  opacity: 0;
  cursor: pointer;
`;

interface FromComputerFormProps {
  onClose: () => void;
  onAddAssets: (assets: FileWithRawFile[]) => void;
  trackedLocation?: string;
}

export const FromComputerForm = ({
  onClose,
  onAddAssets,
  trackedLocation,
}: FromComputerFormProps) => {
  const { formatMessage } = useIntl();
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { trackUsage } = useTracking();

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    inputRef.current?.click();
  };

  const handleChange = () => {
    const files = inputRef.current?.files;
    const assets: FileWithRawFile[] = [];

    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
          const asset = rawFileToAsset(file, AssetSource.Computer);
          assets.push(asset);
        }
      }
    }

    if (trackedLocation) {
      trackUsage('didSelectFile', { source: 'computer', location: trackedLocation });
    }

    onAddAssets(assets);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (e?.dataTransfer?.files) {
      const files = e.dataTransfer.files;
      const assets = [];

      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
          const asset = rawFileToAsset(file, AssetSource.Computer);
          assets.push(asset);
        }
      }

      onAddAssets(assets);
    }

    setDragOver(false);
  };

  return (
    <form>
      <Box paddingLeft={8} paddingRight={8} paddingTop={6} paddingBottom={6}>
        <label>
          <MediaBox
            paddingTop={11}
            paddingBottom={11}
            hasRadius
            justifyContent="center"
            borderColor={dragOver ? 'primary500' : 'neutral300'}
            background={dragOver ? 'primary100' : 'neutral100'}
            position="relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Flex justifyContent="center">
              <Wrapper>
                <IconWrapper>
                  <PicturePlus aria-hidden width="3.2rem" height="3.2rem" />
                </IconWrapper>

                <Box paddingTop={3} paddingBottom={5}>
                  <Typography variant="delta" textColor="neutral600" tag="span">
                    {formatMessage({
                      id: getTrad('input.label'),
                      defaultMessage: 'Drag & Drop here or',
                    })}
                  </Typography>
                </Box>

                <OpaqueBox
                  tag="input"
                  position="absolute"
                  left={0}
                  right={0}
                  bottom={0}
                  top={0}
                  width="100%"
                  type="file"
                  multiple
                  name="files"
                  aria-label={formatMessage({
                    id: getTrad('input.label'),
                    defaultMessage: 'Drag & Drop here or',
                  })}
                  tabIndex={-1}
                  ref={inputRef}
                  zIndex={1}
                  onChange={handleChange}
                />

                <Box position="relative">
                  <Button type="button" onClick={handleClick}>
                    {formatMessage({
                      id: getTrad('input.button.label'),
                      defaultMessage: 'Browse files',
                    })}
                  </Button>
                </Box>
              </Wrapper>
            </Flex>
          </MediaBox>
        </label>
      </Box>

      <Modal.Footer>
        <Button onClick={onClose} variant="tertiary">
          {formatMessage({
            id: 'app.components.Button.cancel',
            defaultMessage: 'cancel',
          })}
        </Button>
      </Modal.Footer>
    </form>
  );
};
