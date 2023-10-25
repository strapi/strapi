/**
 *
 * useLicenseLimitNotification
 *
 */
import * as React from 'react';

import { useNotification } from '@strapi/helper-plugin';
import isNil from 'lodash/isNil';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { useLicenseLimits } from './useLicenseLimits';

const STORAGE_KEY_PREFIX = 'strapi-notification-seat-limit';

const BILLING_STRAPI_CLOUD_URL = 'https://cloud.strapi.io/profile/billing';
const BILLING_SELF_HOSTED_URL = 'https://strapi.io/billing/request-seats';

export const useLicenseLimitNotification = () => {
  const { formatMessage } = useIntl();
  const { license, isError, isLoading } = useLicenseLimits();
  const toggleNotification = useNotification();
  const { pathname } = useLocation();

  const { enforcementUserCount, permittedSeats, licenseLimitStatus, isHostedOnStrapiCloud } =
    license;

  React.useEffect(() => {
    if (isError || isLoading) {
      return;
    }

    const shouldDisplayNotification =
      !isNil(permittedSeats) &&
      !window.sessionStorage.getItem(`${STORAGE_KEY_PREFIX}-${pathname}`) &&
      (licenseLimitStatus === 'AT_LIMIT' || licenseLimitStatus === 'OVER_LIMIT');

    let notificationType;

    if (licenseLimitStatus === 'OVER_LIMIT') {
      notificationType = 'warning';
    } else if (licenseLimitStatus === 'AT_LIMIT') {
      notificationType = 'softWarning';
    }

    if (shouldDisplayNotification) {
      toggleNotification({
        type: notificationType,
        message: formatMessage(
          {
            id: 'notification.ee.warning.over-.message',
            defaultMessage:
              "Add seats to {licenseLimitStatus, select, OVER_LIMIT {invite} other {re-enable}} Users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
          },
          { licenseLimitStatus }
        ),
        title: formatMessage(
          {
            id: 'notification.ee.warning.at-seat-limit.title',
            defaultMessage:
              '{licenseLimitStatus, select, OVER_LIMIT {Over} other {At}} seat limit ({enforcementUserCount}/{permittedSeats})',
          },
          {
            licenseLimitStatus,
            enforcementUserCount,
            permittedSeats,
          }
        ),
        link: {
          url: isHostedOnStrapiCloud ? BILLING_STRAPI_CLOUD_URL : BILLING_SELF_HOSTED_URL,
          label: formatMessage(
            {
              id: 'notification.ee.warning.seat-limit.link',
              defaultMessage:
                '{isHostedOnStrapiCloud, select, true {ADD SEATS} other {CONTACT SALES}}',
            },
            { isHostedOnStrapiCloud }
          ),
        },
        blockTransition: true,
        onClose() {
          window.sessionStorage.setItem(`${STORAGE_KEY_PREFIX}-${pathname}`, 'true');
        },
      });
    }
  }, [
    toggleNotification,
    license,
    pathname,
    formatMessage,
    isLoading,
    permittedSeats,
    licenseLimitStatus,
    enforcementUserCount,
    isHostedOnStrapiCloud,
    isError,
  ]);
};
