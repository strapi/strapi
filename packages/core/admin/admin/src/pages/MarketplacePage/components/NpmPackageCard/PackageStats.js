import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Flex } from '@strapi/design-system/Flex';
import { Icon } from '@strapi/design-system/Icon';
import Github from '@strapi/icons/Github';
import Download from '@strapi/icons/Download';
import Star from '@strapi/icons/Star';
import { Divider } from '@strapi/design-system/Divider';

const VerticalDivider = styled(Divider)`
  width: 12px;
  transform: rotate(90deg);
`;

const PackageStats = ({ githubStars, weeklyDownloads }) => {
  return (
    <Flex>
      {!!githubStars && (
        <>
          <Icon as={Github} height="12px" width="12px" />
          <Icon as={Star} height="12px" width="12px" marginLeft={1} color="warning500" />
          <Box marginLeft={1}>
            <Typography variant="pi" textColor="neutral800" lineHeight={16}>
              {githubStars}
            </Typography>
          </Box>
          <VerticalDivider
            unsetMargin={false}
            background="neutral200"
            marginLeft={1}
            marginRight={1}
          />
        </>
      )}
      <Icon as={Download} height="12px" width="12px" />
      <Box marginLeft={1}>
        <Typography variant="pi" textColor="neutral800" lineHeight={16}>
          {weeklyDownloads}
        </Typography>
      </Box>
    </Flex>
  );
};

PackageStats.defaultProps = {
  githubStars: 0,
  weeklyDownloads: 0,
};

PackageStats.propTypes = {
  githubStars: PropTypes.number,
  weeklyDownloads: PropTypes.number,
};

export default PackageStats;
