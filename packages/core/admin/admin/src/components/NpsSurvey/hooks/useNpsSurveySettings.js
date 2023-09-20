import { usePersistentState } from '@strapi/helper-plugin';

// Exported to make it available during admin user registration.
// Because we only enable the NPS for users who subscribe to the newsletter when signing up
export function useNpsSurveySettings() {
  const [npsSurveySettings, setNpsSurveySettings] = usePersistentState(
    'STRAPI_NPS_SURVEY_SETTINGS',
    {
      enabled: true,
      lastResponseDate: null,
      firstDismissalDate: null,
      lastDismissalDate: null,
    }
  );

  return { npsSurveySettings, setNpsSurveySettings };
}
