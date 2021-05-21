import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useAppInfos, useNotification } from '@strapi/helper-plugin';
import checkLatestStrapiVersion from './utils/checkLatestStrapiVersion';
import fetchStrapiLatestRelease from './utils/api';

const { STRAPI_ADMIN_UPDATE_NOTIFICATION } = process.env;
const canFetchRelease = STRAPI_ADMIN_UPDATE_NOTIFICATION === 'false';
const showUpdateNotif = !JSON.parse(localStorage.getItem('STRAPI_UPDATE_NOTIF'));

const ReleaseNotification = () => {
  const { strapiVersion } = useAppInfos();
  const toggleNotification = useNotification();
  const { data: tag_name, status } = useQuery({
    queryKey: 'strapi-release',
    queryFn: fetchStrapiLatestRelease,
    enabled: canFetchRelease,
  });

  useEffect(() => {
    if (status === 'success' && showUpdateNotif) {
      const shouldUpdateStrapi = checkLatestStrapiVersion(strapiVersion, tag_name);

      if (shouldUpdateStrapi) {
        toggleNotification({
          type: 'info',
          message: { id: 'notification.version.update.message' },
          link: {
            url: `https://github.com/strapi/strapi/releases/tag/${tag_name}`,
            label: {
              id: 'notification.version.update.link',
            },
          },
          blockTransition: true,
          onClose: () => localStorage.setItem('STRAPI_UPDATE_NOTIF', true),
        });
      }
    }
  }, [status, tag_name, strapiVersion, toggleNotification]);

  return null;
};

export default ReleaseNotification;
