import { useGetSettingsQuery } from '../services/settings';

export const useAITranslationsAvailability = (): boolean => {
  const { data: settings } = useGetSettingsQuery();

  return settings?.data?.aiLocalizationsAvailable === true;
};
