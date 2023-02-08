/**
 *
 * useLicenseLimitNotification
 *
 */
import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router';
import { useNotification } from '@strapi/helper-plugin';
import useLicenseLimits from '../useLicenseLimits';

const STORAGE_KEY_PREFIX = 'strapi-notification-seat-limit-disabled';

const BILLING_STRAPI_CLOUD_URL = 'https://cloud.strapi.io/profile/billing';
const BILLING_SELF_HOSTED_URL =
  'https://strapi.chargebeeportal.com/portal/v2/login?forward=portal_main';

const useLicenseLimitNotification = () => {
  const { formatMessage } = useIntl();
  let { license } = useLicenseLimits();
  const toggleNotification = useNotification();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!license?.data) {
      return;
    }

    const { currentUserCount, permittedSeats, licenseLimitStatus, isHostedOnStrapiCloud } =
      license?.data ?? {};

    const shouldDisplayNotification =
      permittedSeats &&
      window.sessionStorage.getItem(`${STORAGE_KEY_PREFIX}-${pathname}`) &&
      ['/', '/users'].every(pathname.includes);

    if (shouldDisplayNotification) {
      toggleNotification({
        type: licenseLimitStatus === 'OVER_LIMIT' ? 'warning' : 'softWarning',
        message: formatMessage(
          {
            id: 'notification.ee.warning.seat-limit.message',
            defaultMessage:
              "Add seats to invite more Users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
          },
          { licenseLimitStatus }
        ),
        title: formatMessage(
          {
            id: 'notification.ee.warning.seat-limit.title',
            defaultMessage: 'Over seat limit ({currentUserCount}/{permittedSeats})',
          },
          {
            licenseLimitStatus,
            currentUserCount,
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
          window.sessionStorage.setItem(`${STORAGE_KEY_PREFIX}-${pathname}`, true);
        },
      });
    }
  }, [toggleNotification, license.data, pathname, formatMessage]);
};

export default useLicenseLimitNotification;
