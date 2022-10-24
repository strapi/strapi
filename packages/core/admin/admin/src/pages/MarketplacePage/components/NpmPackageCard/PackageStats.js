import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Typography } from '@strapi/design-system/Typography';
import { Icon } from '@strapi/design-system/Icon';
import { Divider } from '@strapi/design-system/Divider';
import { Stack } from '@strapi/design-system/Stack';
import Github from '@strapi/icons/Github';
import Download from '@strapi/icons/Download';
import Star from '@strapi/icons/Star';

const VerticalDivider = styled(Divider)`
  width: 0.75rem;
  transform: rotate(90deg);
`;

const PackageStats = ({ githubStars, weeklyDownloads }) => {
  return (
    <Stack horizontal spacing={1}>
      {!!githubStars && (
        <>
          <Icon as={Github} height="0.75rem" width="0.75rem" />
          <Icon as={Star} height="0.75rem" width="0.75rem" color="warning500" />
          <p aria-label={`This package was starred ${githubStars} on GitHub`}>
            <Typography variant="pi" textColor="neutral800" lineHeight={16}>
              {githubStars}
            </Typography>
          </p>
          <VerticalDivider unsetMargin={false} background="neutral200" />
        </>
      )}
      <Icon as={Download} height="0.75rem" width="0.75rem" />
      <p aria-label={`This package was downloaded ${weeklyDownloads} times in last 7 days`}>
        <Typography variant="pi" textColor="neutral800" lineHeight={16}>
          {weeklyDownloads}
        </Typography>
      </p>
    </Stack>
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
