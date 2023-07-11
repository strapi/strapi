import React from 'react';

import { Flex, GridItem, Icon, Tooltip, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { pxToRem } from '@strapi/helper-plugin';
import { ExclamationMarkCircle, ExternalLink } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useLicenseLimits } from '../../../../../../hooks';

const BILLING_STRAPI_CLOUD_URL = 'https://cloud.strapi.io/profile/billing';
const BILLING_SELF_HOSTED_URL = 'https://strapi.io/billing/request-seats';

export const AdminSeatInfoEE = () => {
  const { formatMessage } = useIntl();
  const {
    license: { licenseLimitStatus, enforcementUserCount, permittedSeats, isHostedOnStrapiCloud },
    isError,
    isLoading,
  } = useLicenseLimits();

  if (isError || isLoading || !permittedSeats) {
    return null;
  }

  return (
    <GridItem col={6} s={12}>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({
          id: 'Settings.application.admin-seats',
          defaultMessage: 'Admin seats',
        })}
      </Typography>
      <Flex gap={2}>
        <Flex>
          <Typography as="p">
            {formatMessage(
              {
                id: 'Settings.application.ee.admin-seats.count',
                defaultMessage: '<text>{enforcementUserCount}</text>/{permittedSeats}',
              },
              {
                permittedSeats,
                enforcementUserCount,
                // eslint-disable-next-line react/no-unstable-nested-components
                text: (chunks) => (
                  <Typography
                    fontWeight="semiBold"
                    textColor={enforcementUserCount > permittedSeats ? 'danger500' : null}
                  >
                    {chunks}
                  </Typography>
                ),
              }
            )}
          </Typography>
        </Flex>
        {licenseLimitStatus === 'OVER_LIMIT' && (
          <Tooltip
            description={formatMessage({
              id: 'Settings.application.ee.admin-seats.at-limit-tooltip',
              defaultMessage: 'At limit: add seats to invite more users',
            })}
          >
            <Icon
              width={`${pxToRem(14)}rem`}
              height={`${pxToRem(14)}rem`}
              color="danger500"
              as={ExclamationMarkCircle}
            />
          </Tooltip>
        )}
      </Flex>
      <Link
        href={isHostedOnStrapiCloud ? BILLING_STRAPI_CLOUD_URL : BILLING_SELF_HOSTED_URL}
        isExternal
        endIcon={<ExternalLink />}
      >
        {formatMessage(
          {
            id: 'Settings.application.ee.admin-seats.add-seats',
            defaultMessage:
              '{isHostedOnStrapiCloud, select, true {Add seats} other {Contact sales}}',
          },
          { isHostedOnStrapiCloud }
        )}
      </Link>
    </GridItem>
  );
};
