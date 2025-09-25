import { HomePageCE } from '../../../../admin/src/pages/Home/HomePage';
import { useAIUsageWarning } from '../hooks/useAIUsageWarning';
import { useLicenseLimitNotification } from '../hooks/useLicenseLimitNotification';

export const HomePageEE = () => {
  useLicenseLimitNotification();
  useAIUsageWarning();

  return <HomePageCE />;
};
