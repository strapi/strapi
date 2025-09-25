import { HomePageCE } from '../../../../admin/src/pages/Home/HomePage';
import { useLicenseLimitNotification } from '../hooks/useLicenseLimitNotification';

export const HomePageEE = () => {
  useLicenseLimitNotification();

  return <HomePageCE />;
};
