import React from 'react';
import { useIntl } from 'react-intl';
import { Flex } from '@strapi/design-system/Flex';
import { Tooltip } from '@strapi/design-system/Tooltip';
import { Icon } from '@strapi/design-system/Icon';
import { GridItem } from '@strapi/design-system/Grid';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { Link } from '@strapi/design-system/v2/Link';
import ExternalLink from '@strapi/icons/ExternalLink';
import ExclamationMarkCircle from '@strapi/icons/ExclamationMarkCircle';
import { useLicenseLimitInfos } from '../../../../../../hooks';

const AdminSeatInfo = () => {
  const { formatMessage } = useIntl();
  const licenseLimitInfos = useLicenseLimitInfos();
  const { licenseLimitStatus, currentUserCount, permittedSeats, isHostedOnStrapiCloud } =
    licenseLimitInfos;
  const linkURL = isHostedOnStrapiCloud
    ? 'https://cloud.strapi.io/profile/billing'
    : 'https://share.hsforms.com/1WhxtbTkJSUmfqqEuv4pwuA43qp4';

  if (!permittedSeats) {
    return <></>;
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
            {currentUserCount || 'NA'}
          </Typography>
          <Typography as="p">/</Typography>
          <Typography as="p">{permittedSeats || 'NA'}</Typography>
        </Flex>
        {licenseLimitStatus === 'AT_LIMIT' && (
          <Tooltip
            description={formatMessage({
              id: 'Settings.application.admin-seats.at-limit-tooltip',
              defaultMessage: 'At limit: add seats to invite more users',
            })}
          >
            <Icon
              width={`${14 / 16}rem`}
              height={`${14 / 16}rem`}
              color="danger500"
              as={ExclamationMarkCircle}
            />
          </Tooltip>
        )}
      </Stack>
      <Link href={linkURL} isExternal endIcon={<ExternalLink />}>
        {formatMessage({
          id: isHostedOnStrapiCloud
            ? 'Settings.application.ee.link-add-seats'
            : 'Settings.application.ee.link-contact-sales',
          defaultMessage: isHostedOnStrapiCloud ? 'Add seats' : 'Contact sales',
        })}
      </Link>
    </GridItem>
  );
};

export default AdminSeatInfo;
