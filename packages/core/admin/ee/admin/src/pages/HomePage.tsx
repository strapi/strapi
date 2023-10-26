import { HomePageCE } from '../../../../admin/src/pages/HomePage';
import { useLicenseLimitNotification } from '../hooks/useLicenseLimitNotification';

export function HomePageEE() {
  useLicenseLimitNotification();

  return <HomePageCE />;
}
