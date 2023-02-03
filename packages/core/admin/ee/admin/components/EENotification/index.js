import { useEffect } from 'react';
import { useLicenseLimitNotification, useLicenseLimitInfos } from '../../hooks';

// Shallow component that is overridden in EE
const EENotification = () => {
  const licenseLimitNotification = useLicenseLimitNotification();
  const licenseLimitInfos = useLicenseLimitInfos();
  const { shouldNotify } = licenseLimitInfos;

  useEffect(() => {
    if (shouldNotify) {
      licenseLimitNotification(() => {
        window.sessionStorage.setItem('licenseNotificationShownOnHome', true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default EENotification;
