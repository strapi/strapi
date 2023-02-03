/**
 *
 * useLicenseLimitNotification
 *
 */
// import { useRef } from 'react';
import { useNotification } from '@strapi/helper-plugin';
import useLicenseLimitInfos from '../useLicenseLimitInfos';

const notificationBody = (currentUserCount, permittedSeats, licenseLimitStatus) => {
  let notification = {};

  if (licenseLimitStatus === 'OVER_LIMIT') {
    notification = {
      type: 'warning',
      message: {
        id: 'notification.ee.warning.over-seat-limit',
        defaultMessage:
          "Add seats to re-enable users. If you already did it but it's not reflected in Strapi yet, make sure to restart your app.",
      },
      title: `Over seat limit (${currentUserCount}/${permittedSeats})`,
      link: {
        url: 'test url',
        label: 'ADD SEATS',
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
      title: `At seat limit (${currentUserCount}/${permittedSeats})`,
      link: {
        url: 'test url',
        label: 'ADD SEATS',
      },
      blockTransition: true,
    };

    return notification;
  }

  return notification;
};

const useLicenseLimitNotification = () => {
  const licenseLimitInfos = useLicenseLimitInfos();
  const toggleNotification = useNotification();
  const { currentUserCount, permittedSeats, licenseLimitStatus } = licenseLimitInfos;

  if (!licenseLimitInfos) return;

  // Won't notify if license user and seat info is not present

  const notification = notificationBody(currentUserCount, permittedSeats, licenseLimitStatus);

  // eslint-disable-next-line consistent-return
  return (onClose) => {
    toggleNotification({ ...notification, onClose });
  };
};

export default useLicenseLimitNotification;
