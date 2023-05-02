import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Box, Flex, Typography } from '@strapi/design-system';

import { ComponentIcon } from '../../../components/ComponentIcon';
import { useLayoutDnd } from '../hooks/useLayoutDnd';

const CustomLink = styled(Flex)`
  text-decoration: none;

  &:focus,
  &:hover {
    ${({ theme }) => `
      background-color: ${theme.colors.primary100};
      border-color: ${theme.colors.primary200};

      ${Typography} {
          color: ${theme.colors.primary600};
      }
    `}

    /* > ComponentIcon */
    > div:first-child {
      background: ${({ theme }) => theme.colors.primary200};
      color: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

const DynamicZoneList = ({ components }) => {
  const { componentLayouts } = useLayoutDnd();

  return (
    <Flex gap={2} overflow="scroll hidden" padding={3}>
      {components.map((componentUid) => (
        <CustomLink
          hasRadius
          background="neutral0"
          justifyContent="center"
          alignItems="center"
          height={`${84 / 16}rem`}
          minWidth={`${140 / 16}rem`}
          key={componentUid}
          padding={2}
          direction="column"
          borderColor="neutral200"
          as={Link}
          to={`/content-manager/components/${componentUid}/configurations/edit`}
        >
          <ComponentIcon />

          <Box paddingTop={1}>
            <Typography fontSize={1} textColor="neutral600" fontWeight="bold">
              {componentLayouts?.[componentUid]?.info?.displayName ?? ''}
            </Typography>
          </Box>
        </CustomLink>
      ))}
    </Flex>
  );
};

DynamicZoneList.propTypes = {
  components: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default DynamicZoneList;
