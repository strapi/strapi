/**
 *
 * useLicenseLimitNotification
 *
 */
import * as React from 'react';

import isNil from 'lodash/isNil';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { NotificationConfig, useNotification } from '../../../../admin/src/features/Notifications';

import { useLicenseLimits } from './useLicenseLimits';

const STORAGE_KEY_PREFIX = 'strapi-notification-seat-limit';

const BILLING_SELF_HOSTED_URL = 'https://strapi.io/billing/request-seats';
const MANAGE_SEATS_URL = 'https://strapi.io/billing/manage-seats';

export const useLicenseLimitNotification = () => {
  const { formatMessage } = useIntl();
  const { license, isError, isLoading } = useLicenseLimits();
  const { toggleNotification } = useNotification();
  const { pathname } = useLocation();

  const { enforcementUserCount, permittedSeats, licenseLimitStatus, type } = license ?? {};

  React.useEffect(() => {
    if (isError || isLoading) {
      return;
    }

    const shouldDisplayNotification =
      !isNil(permittedSeats) &&
      !window.sessionStorage.getItem(`${STORAGE_KEY_PREFIX}-${pathname}`) &&
      licenseLimitStatus === 'OVER_LIMIT';

    let notificationType: NotificationConfig['type'];

    if (licenseLimitStatus === 'OVER_LIMIT') {
      notificationType = 'danger';
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
          url: type === 'gold' ? BILLING_SELF_HOSTED_URL : MANAGE_SEATS_URL,
          label: formatMessage({
            id: 'notification.ee.warning.seat-limit.link',
            defaultMessage: type === 'gold' ? 'Contact sales' : 'Manage seats',
          }),
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
    isError,
    type,
  ]);
};
