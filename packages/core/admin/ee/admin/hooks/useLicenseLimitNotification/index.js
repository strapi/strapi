/**
 *
 * useLicenseLimitNotification
 *
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useNotification } from '@strapi/helper-plugin';
import useLicenseLimitInfos from '../useLicenseLimitInfos';

const notificationBody = (
  currentUserCount,
  permittedSeats,
  licenseLimitStatus,
  isHostedOnStrapiCloud
) => {
  let notification = {};
  const linkURL = isHostedOnStrapiCloud
    ? 'https://cloud.strapi.io/profile/billing'
    : 'https://strapi.chargebeeportal.com/portal/v2/login?forward=portal_main';
  const linkLabel = isHostedOnStrapiCloud ? 'ADD SEATS' : 'CONTACT SALES';

  if (licenseLimitStatus === 'OVER_LIMIT') {
    notification = {
      type: 'warning',
      message: {
        id: 'notification.ee.warning.over-seat-limit',
        defaultMessage:
          "Add seats to re-enable users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
      },
      // Title is translated in the Notification component
      title: {
        id: 'notification.ee.warning.over-seat-limit.title',
        defaultMessage: 'Over seat limit ({currentUserCount}/{permittedSeats})',
        values: { currentUserCount, permittedSeats },
      },
      link: {
        url: linkURL,
        label: linkLabel,
      },
      blockTransition: true,
    };

    return notification;
  }

  if (licenseLimitStatus === 'AT_LIMIT') {
    notification = {
      type: 'softWarning',
      message: {
        id: 'notification.ee.warning.at-seat-limit',
        defaultMessage:
          "Add seats to re-enable users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
      },
      title: {
        id: 'notification.ee.warning.at-seat-limit.title',
        defaultMessage: 'At seat limit ({currentUserCount}/{permittedSeats})',
        values: { currentUserCount, permittedSeats },
      },
      link: {
        url: linkURL,
        label: linkLabel,
      },
      blockTransition: true,
    };

    return notification;
  }

  return notification;
};

const shouldDisplayNotification = (pathname) => {
  const isLocation = (string) => pathname.includes(string);
  const shownInSession = window.sessionStorage.getItem(`notification-${pathname}`);

  if (isLocation('/') && shownInSession) {
    return false;
  }

  if (isLocation('users') && shownInSession) {
    return false;
  }

  return true;
};

const useLicenseLimitNotification = () => {
  let licenseLimitInfos = useLicenseLimitInfos();
  const toggleNotification = useNotification();
  const location = useLocation();

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (!licenseLimitInfos || !licenseLimitInfos.permittedSeats) return;

    if (!shouldDisplayNotification(location.pathname)) return;

    const { currentUserCount, permittedSeats, licenseLimitStatus, isHostedOnStrapiCloud } =
      licenseLimitInfos;
    const notification = notificationBody(
      currentUserCount,
      permittedSeats,
      licenseLimitStatus,
      isHostedOnStrapiCloud
    );
    const onClose = () => window.sessionStorage.setItem(`notification-${location.pathname}`, true);
    toggleNotification({ ...notification, onClose });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useLicenseLimitNotification;
