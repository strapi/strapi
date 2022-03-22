import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { KeyboardNavigable } from '@strapi/design-system/KeyboardNavigable';
import { Typography } from '@strapi/design-system/Typography';

import { GridColumnSize } from '../../constants';

const GridLayout = styled(Box)`
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(${({ size }) => `${GridColumnSize[size]}px`}, 1fr)
  );
  grid-gap: ${({ theme }) => theme.spaces[4]};
`;

export const FolderList = ({ title, folders, size }) => {
  return (
    <KeyboardNavigable tagName="article">
      {title && (
        <Box paddingTop={2} paddingBottom={2}>
          <Typography as="h2" variant="delta" fontWeight="semiBold">
            {title}
          </Typography>
        </Box>
      )}

      <GridLayout size={size}>
        {folders.map((folder, index) => {
          // eslint-disable-next-line react/no-array-index-key
          return <Box key={`folder-${index}`}>{JSON.stringify(folder)}</Box>;
        })}
      </GridLayout>
    </KeyboardNavigable>
  );
};

FolderList.defaultProps = {
  size: 'M',
  title: null,
};

FolderList.propTypes = {
  folders: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  size: PropTypes.oneOf(['S', 'M']),
  title: PropTypes.string,
};
