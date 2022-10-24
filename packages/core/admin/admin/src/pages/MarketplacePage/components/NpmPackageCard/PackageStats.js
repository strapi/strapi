import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import { Icon } from '@strapi/design-system/Icon';
import { Divider } from '@strapi/design-system/Divider';
import { Stack } from '@strapi/design-system/Stack';
import Github from '@strapi/icons/Github';
import Download from '@strapi/icons/Download';
import Star from '@strapi/icons/Star';
import { pxToRem } from '@strapi/helper-plugin';

const VerticalDivider = styled(Divider)`
  width: ${pxToRem(12)};
  transform: rotate(90deg);
`;

const PackageStats = ({ githubStars, weeklyDownloads, npmPackageType }) => {
  const { formatMessage } = useIntl();

  return (
    <Stack horizontal spacing={1}>
      {!!githubStars && (
        <>
          <Icon as={Github} height={pxToRem(12)} width={pxToRem(12)} aria-hidden />
          <Icon as={Star} height={pxToRem(12)} width={pxToRem(12)} color="warning500" aria-hidden />
          <p
            aria-label={formatMessage(
              {
                id: 'admin.pages.MarketPlacePage[{package}].githubStars',
                defaultMessage: `This {package} was starred {starsCount} on GitHub`,
              },
              {
                starsCount: githubStars,
                package: npmPackageType,
              }
            )}
          >
            <Typography variant="pi" textColor="neutral800" lineHeight={16}>
              {githubStars}
            </Typography>
          </p>
          <VerticalDivider unsetMargin={false} background="neutral200" />
        </>
      )}
      <Icon as={Download} height={pxToRem(12)} width={pxToRem(12)} aria-hidden />
      <p
        aria-label={formatMessage(
          {
            id: `admin.pages.MarketPlacePage[{package}].downloads`,
            defaultMessage: `This {package} has {downloadsCount} weekly downloads`,
          },
          {
            downloadsCount: weeklyDownloads,
            package: npmPackageType,
          }
        )}
      >
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
  npmPackageType: PropTypes.string.isRequired,
};

export default PackageStats;
