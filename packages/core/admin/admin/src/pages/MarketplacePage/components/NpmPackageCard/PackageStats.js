import React from 'react';

import { Divider, Flex, Icon, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { Download, Github, Star } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

const VerticalDivider = styled(Divider)`
  width: ${pxToRem(12)};
  transform: rotate(90deg);
`;

const PackageStats = ({ githubStars, npmDownloads, npmPackageType }) => {
  const { formatMessage } = useIntl();

  return (
    <Flex gap={1}>
      {!!githubStars && (
        <>
          <Icon as={Github} height={pxToRem(12)} width={pxToRem(12)} aria-hidden />
          <Icon as={Star} height={pxToRem(12)} width={pxToRem(12)} color="warning500" aria-hidden />
          <p
            aria-label={formatMessage(
              {
                id: `admin.pages.MarketPlacePage.${npmPackageType}.githubStars`,
                defaultMessage: `This {package} was starred {starsCount} on GitHub`,
              },
              {
                starsCount: githubStars,
                package: npmPackageType,
              }
            )}
          >
            <Typography variant="pi" textColor="neutral800">
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
            id: `admin.pages.MarketPlacePage.${npmPackageType}.downloads`,
            defaultMessage: `This {package} has {downloadsCount} weekly downloads`,
          },
          {
            downloadsCount: npmDownloads,
            package: npmPackageType,
          }
        )}
      >
        <Typography variant="pi" textColor="neutral800">
          {npmDownloads}
        </Typography>
      </p>
    </Flex>
  );
};

PackageStats.defaultProps = {
  githubStars: 0,
  npmDownloads: 0,
};

PackageStats.propTypes = {
  githubStars: PropTypes.number,
  npmDownloads: PropTypes.number,
  npmPackageType: PropTypes.string.isRequired,
};

export default PackageStats;
