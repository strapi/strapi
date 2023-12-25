import { HomePageCE } from '../../../../admin/src/pages/HomePage';
import { useLicenseLimitNotification } from '../hooks/useLicenseLimitNotification';

export const HomePageEE = () => {
  useLicenseLimitNotification();

  return <HomePageCE />;
};
