import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';
import React from 'react';
import { Table, Thead, Tbody, Tr, Td, Th } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';
import { Avatar } from '@strapi/design-system/Avatar';
import { Box } from '@strapi/design-system/Box';
import PropTypes from 'prop-types';

export const AssetTable = ({ assets, assetCount }) => {
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
            </Tr>
          </Thead>
          <Tbody>
            {assets.map(entry => (
              <Tr key={entry.id}>
                <Td>
                  <Typography textColor="neutral800">{entry.id}</Typography>
                </Td>
                <Td>
                  <Avatar
                    src={prefixFileUrlWithBackendUrl(entry?.formats?.thumbnail?.url || entry.url)}
                    alt={entry.caption}
                  />
                </Td>
                <Td>
                  <Typography textColor="neutral800">{entry.name}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{entry.ext}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{entry.size}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{entry.height}</Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral800">{entry.width}</Typography>
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
};
