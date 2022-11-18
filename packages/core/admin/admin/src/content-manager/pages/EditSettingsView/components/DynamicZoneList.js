import React from 'react';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import { Flex, Typography, Box, Stack } from '@strapi/design-system';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import useLayoutDnd from '../../../hooks/useLayoutDnd';

const CustomFlex = styled(Flex)`
  border-radius: 50%;
  svg {
    & > * {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
    width: 12px;
    height: 12px;
  }
`;
const CustomLink = styled(Flex)`
  text-decoration: none;
  &:hover {
    ${({ theme }) => `
      background: ${theme.colors.primary100};
      svg {
        & > * {
          fill: ${theme.colors.primary600};
        }
      }
      ${Typography} {
          color: ${theme.colors.primary600};
      }
      ${CustomFlex} {
        background: ${theme.colors.primary200};
      }
      border-color: ${theme.colors.primary200};
    `}
  }
`;

const DynamicZoneList = ({ components }) => {
  const { componentLayouts } = useLayoutDnd();

  return (
    <Stack spacing={2} horizontal overflow="scroll hidden" padding={3}>
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
          <CustomFlex
            width={`${32 / 16}rem`}
            height={`${32 / 16}rem`}
            background="neutral150"
            justifyContent="center"
            alignItems="center"
            padding={2}
          >
            <FontAwesomeIcon icon={get(componentLayouts, [componentUid, 'info', 'icon'], '')} />
          </CustomFlex>
          <Box paddingTop={1}>
            <Typography fontSize={1} textColor="neutral600" fontWeight="bold">
              {get(componentLayouts, [componentUid, 'info', 'displayName'], '')}
            </Typography>
          </Box>
        </CustomLink>
      ))}
    </Stack>
  );
};

DynamicZoneList.propTypes = {
  components: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default DynamicZoneList;
