import React from 'react';
import { useIntl } from 'react-intl';
import { Flex, Tooltip, Icon, GridItem, Typography, Stack } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2/Link';
import { ExternalLink, ExclamationMarkCircle } from '@strapi/icons';
import { pxToRem } from '@strapi/helper-plugin';
import { useLicenseLimits } from '../../../../../../hooks';

const BILLING_STRAPI_CLOUD_URL = 'https://cloud.strapi.io/profile/billing';
const BILLING_SELF_HOSTED_URL = 'https://share.hsforms.com/1WhxtbTkJSUmfqqEuv4pwuA43qp4';

const AdminSeatInfo = () => {
  const { formatMessage } = useIntl();
  const { license } = useLicenseLimits();
  const { licenseLimitStatus, currentUserCount, permittedSeats, isHostedOnStrapiCloud } =
    license?.data ?? {};

  if (!permittedSeats) {
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
      <Stack spacing={2} horizontal>
        <Flex>
          <Typography
            as="p"
            textColor={licenseLimitStatus === 'OVER_LIMIT' ? 'danger500' : ''}
            fontWeight={licenseLimitStatus === 'OVER_LIMIT' ? 'bold' : ''}
          >
            {formatMessage(
              {
                id: 'Settings.application.ee.admin-seats.count',
                defaultMessage: '{currentUserCount}/{permittedSeats}',
              },
              { permittedSeats, currentUserCount }
            )}
          </Typography>
        </Flex>
        {licenseLimitStatus === 'AT_LIMIT' && (
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
      </Stack>
      <Link
        href={isHostedOnStrapiCloud ? BILLING_STRAPI_CLOUD_URL : BILLING_SELF_HOSTED_URL}
        isExternal
        endIcon={<ExternalLink />}
      >
        {formatMessage(
          {
            id: 'Settings.application.ee.admin-seats.add-seats',
            defaultMessage:
              '{isHostedOnStrapiCloud, select, true {Add seats} false {Contact sales}}',
          },
          { isHostedOnStrapiCloud }
        )}
      </Link>
    </GridItem>
  );
};

export default AdminSeatInfo;
