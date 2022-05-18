import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { stringify } from 'qs';
import { useHistory, useLocation } from 'react-router-dom';
import { Box } from '@strapi/design-system/Box';
import { KeyboardNavigable } from '@strapi/design-system/KeyboardNavigable';
import { Flex } from '@strapi/design-system/Flex';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { IconButton } from '@strapi/design-system/IconButton';
import { Typography } from '@strapi/design-system/Typography';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { useQueryParams } from '@strapi/helper-plugin';
import Pencil from '@strapi/icons/Pencil';

import { FolderCard, FolderCardBody, FolderCardCheckbox, FolderCardLink } from '../FolderCard';
import { FolderDefinition } from '../../constants';

const CardTitle = styled(Typography).attrs({
  ellipsis: true,
  fontWeight: 'semiBold',
  textColor: 'neutral800',
  variant: 'omega',
})`
  max-width: 100%;
`;

export const FolderList = ({
  title,
  folders,
  size,
  onSelectFolder,
  onEditFolder,
  selectedFolders,
}) => {
  const history = useHistory();
  const { pathname } = useLocation();
  const [{ query }] = useQueryParams();

  return (
    <KeyboardNavigable tagName="article">
      {title && (
        <Box paddingTop={2} paddingBottom={2}>
          <Typography as="h2" variant="delta" fontWeight="semiBold">
            {title}
          </Typography>
        </Box>
      )}

      <Grid gap={4}>
        {folders.map(folder => {
          const isSelected = !!selectedFolders.find(
            currentFolder => currentFolder.id === folder.id
          );
          const url = `${pathname}?${stringify(
            { ...query, folder: folder.id },
            { encode: false }
          )}`;

          return (
            <GridItem col={3} key={`folder-${folder.uid}`}>
              <FolderCard
                ariaLabel={folder.name}
                id={`folder-${folder.uid}`}
                onDoubleClick={() => history.push(url)}
                startAction={
                  <FolderCardCheckbox
                    value={isSelected}
                    onChange={() => onSelectFolder({ ...folder, type: 'folder' })}
                  />
                }
                cardActions={<IconButton icon={<Pencil />} onClick={() => onEditFolder(folder)} />}
                size={size}
              >
                <FolderCardBody>
                  <FolderCardLink to={url}>
                    <Flex as="h2" direction="column" alignItems="start">
                      <CardTitle>
                        {folder.name}
                        <VisuallyHidden>:</VisuallyHidden>
                      </CardTitle>

                      <Typography as="span" textColor="neutral600" variant="pi">
                        {folder.children.count} folder, {folder.files.count} assets
                      </Typography>
                    </Flex>
                  </FolderCardLink>
                </FolderCardBody>
              </FolderCard>
            </GridItem>
          );
        })}
      </Grid>
    </KeyboardNavigable>
  );
};

FolderList.defaultProps = {
  size: 'M',
  selectedFolders: [],
  title: null,
};

FolderList.propTypes = {
  folders: PropTypes.arrayOf(FolderDefinition).isRequired,
  size: PropTypes.oneOf(['S', 'M']),
  selectedFolders: PropTypes.array,
  onEditFolder: PropTypes.func.isRequired,
  onSelectFolder: PropTypes.func.isRequired,
  title: PropTypes.string,
};
