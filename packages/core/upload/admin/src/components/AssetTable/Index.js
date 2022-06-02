import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';
import React from 'react';
import { Table, Thead, Tbody, Tr, Td, Th } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';
import { Avatar } from '@strapi/design-system/Avatar';
import { Box } from '@strapi/design-system/Box';
import PropTypes from 'prop-types';
import Pencil from '@strapi/icons/Pencil';
import { IconButton } from '@strapi/design-system/IconButton';

export const AssetTable = ({ assets, assetCount, onEditAsset }) => {
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
                  <IconButton onClick={() => onEditAsset(asset)} label="Edit" icon={<Pencil />} />
                </Td>
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
};
