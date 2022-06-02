import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';
import { Table, Thead, Tbody, Tr, Td, Th } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';
import { Avatar } from '@strapi/design-system/Avatar';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import PropTypes from 'prop-types';
import Pencil from '@strapi/icons/Pencil';
import Trash from '@strapi/icons/Trash';
import DownloadIcon from '@strapi/icons/Download';
import { IconButton } from '@strapi/design-system/IconButton';
import { RemoveAssetDialog } from '../EditAssetDialog/RemoveAssetDialog';
import { downloadFile } from '../../utils/downloadFile';
import { CopyLinkButton } from '../CopyLinkButton';
import { createAssetUrl } from '../../utils/createAssetUrl';

export const AssetTable = ({
  assets,
  assetCount,
  onEditAsset,
  canCopyLink,
  canDownload,
  canUpdate,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { formatMessage } = useIntl();

  return (
    <>
      <Box padding={8} background="neutral100">
        <Table colCount={6} rowCount={assetCount}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma">ID</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Preview</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Name</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Extension</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Size</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Height</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Width</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Actions</Typography>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {assets.map(asset => (
              <Tr key={asset.id}>
                <Td>
                  <Typography textColor="neutral800">{asset.id}</Typography>
                </Td>
                <Td>
                  <Avatar
                    src={prefixFileUrlWithBackendUrl(asset?.formats?.thumbnail?.url || asset.url)}
                    alt={asset.caption}
                  />
                </Td>
                <Td>
                  <Typography textColor="neutral800">{asset.name}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{asset.ext}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{asset.size}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{asset.height}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{asset.width}</Typography>
                </Td>
                <Td>
                  <Flex>
                    <IconButton
                      onClick={() => onEditAsset(asset)}
                      label={formatMessage({
                        id: 'asset.edit',
                        defaultMessage: 'Edit',
                      })}
                      icon={<Pencil />}
                    />

                    {canUpdate && !asset.isLocal && (
                      <Box paddingLeft={1}>
                        <IconButton
                          label={formatMessage({
                            id: 'asset.delete',
                            defaultMessage: 'Delete',
                          })}
                          icon={<Trash />}
                          onClick={() => setShowConfirmDialog(true)}
                        />
                      </Box>
                    )}

                    {canDownload && (
                      <Box paddingLeft={1}>
                        <IconButton
                          label={formatMessage({
                            id: 'asset.download',
                            defaultMessage: 'Download',
                          })}
                          icon={<DownloadIcon />}
                          onClick={() => downloadFile(createAssetUrl(asset, false), asset.name)}
                        />
                      </Box>
                    )}

                    {canCopyLink && (
                      <Box paddingLeft={1}>
                        <CopyLinkButton url={createAssetUrl(asset, false)} />
                      </Box>
                    )}
                  </Flex>
                </Td>
                {showConfirmDialog && (
                  <RemoveAssetDialog
                    onClose={() => {
                      setShowConfirmDialog(false);
                    }}
                    asset={asset}
                  />
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </>
  );
};

AssetTable.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  assetCount: PropTypes.number.isRequired,
  onEditAsset: PropTypes.func.isRequired,
  canUpdate: PropTypes.bool.isRequired,
  canCopyLink: PropTypes.bool.isRequired,
  canDownload: PropTypes.bool.isRequired,
};
