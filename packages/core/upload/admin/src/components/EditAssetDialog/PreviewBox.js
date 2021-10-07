import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { IconButton } from '@strapi/parts/IconButton';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import DownloadIcon from '@strapi/icons/DownloadIcon';
import Resize from '@strapi/icons/Resize';
import LinkIcon from '@strapi/icons/LinkIcon';
import { prefixFileUrlWithBackendUrl, useNotification } from '@strapi/helper-plugin';
import getTrad from '../../utils/getTrad';
import { downloadFile } from '../../utils/downloadFile';
import { RemoveAssetDialog } from './RemoveAssetDialog';

const Wrapper = styled.div`
  img {
    margin: 0;
    padding: 0;
    max-height: 100%;
    max-width: 100%;
  }
`;

const ActionRow = styled(Row)`
  height: ${52 / 16}rem;
`;

export const PreviewBox = ({ children, asset, onDelete }) => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleCopyClipBoard = () => {
    toggleNotification({
      type: 'success',
      message: { id: 'notification.link-copied', defaultMessage: 'Link copied into the clipboard' },
    });
  };

  const assetUrl = prefixFileUrlWithBackendUrl(asset.url);

  return (
    <>
      <Box hasRadius background="neutral150" borderColor="neutral200">
        <ActionRow paddingLeft={3} paddingRight={3} justifyContent="flex-end">
          <Stack size={1} horizontal>
            <IconButton
              label={formatMessage({
                id: getTrad('app.utils.delete'),
                defaultMessage: 'Delete',
              })}
              icon={<DeleteIcon />}
              onClick={() => setShowConfirmDialog(true)}
            />
            <IconButton
              label={formatMessage({
                id: getTrad('control-card.download'),
                defaultMessage: 'Download',
              })}
              icon={<DownloadIcon />}
              onClick={() => downloadFile(assetUrl, asset.name)}
            />
            <CopyToClipboard text={assetUrl} onCopy={handleCopyClipBoard}>
              <IconButton
                label={formatMessage({
                  id: getTrad('control-card.copy-link'),
                  defaultMessage: 'Copy link',
                })}
                icon={<LinkIcon />}
              />
            </CopyToClipboard>
            <IconButton
              label={formatMessage({ id: getTrad('control-card.crop'), defaultMessage: 'Crop' })}
              icon={<Resize />}
            />
          </Stack>
        </ActionRow>
        <Wrapper>{children}</Wrapper>
        <ActionRow paddingLeft={3} paddingRight={3} />
      </Box>

      {showConfirmDialog && (
        <RemoveAssetDialog
          onClose={() => {
            setShowConfirmDialog(false);
            onDelete();
          }}
          asset={asset}
        />
      )}
    </>
  );
};

PreviewBox.propTypes = {
  asset: PropTypes.shape({
    id: PropTypes.number,
    height: PropTypes.number,
    width: PropTypes.number,
    size: PropTypes.number,
    createdAt: PropTypes.string,
    ext: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
  }).isRequired,
  children: PropTypes.node.isRequired,
  onDelete: PropTypes.func.isRequired,
};
