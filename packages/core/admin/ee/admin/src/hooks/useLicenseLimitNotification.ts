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

const BILLING_SELF_HOSTED_URL = 'mailto:sales@strapi.io';
const MANAGE_SEATS_URL = 'https://billing.strapi.io';

export const useLicenseLimitNotification = () => {
  const { formatMessage } = useIntl();
  const { license, isError, isLoading } = useLicenseLimits();
  const { toggleNotification } = useNotification();
  const { pathname } = useLocation();

  const { enforcementUserCount, permittedSeats, licenseLimitStatus, type, licenseMode } =
    license ?? {};

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
              'Upgrade your license to {licenseLimitStatus, select, OVER_LIMIT {invite} other {re-enable}} admin users. {licenseMode, select, offline {Once you have the new license file, restart Strapi to apply it.} other {If you already upgraded: the new limit applies automatically within 12 hours or on Strapi restart.}}',
          },
          { licenseLimitStatus, licenseMode }
        ),
        title: formatMessage(
          {
            id: 'notification.ee.warning.at-seat-limit.title',
            defaultMessage:
              '{licenseLimitStatus, select, OVER_LIMIT {Over} other {At}} the admin user limit of this instance ({enforcementUserCount}/{permittedSeats})',
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
            defaultMessage: type === 'gold' ? 'Contact sales' : 'Manage subscription',
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
    licenseMode,
    enforcementUserCount,
    isError,
    type,
  ]);
};
