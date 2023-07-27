import * as React from 'react';

import { Flex, Button, Typography } from '@strapi/design-system';
import { usePersistentState } from '@strapi/helper-plugin';

const delays = {
  postResponse: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
  postFirstDismissal: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  postSubsequentDismissal: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
  cooldown: 5 * 60 * 1000, // 5 minutes in ms
};

const checkIfShouldShowSurvey = (settings) => {
  const { enabled, lastResponseDate, firstDismissalDate, lastDismissalDate } = settings;

  // This function goes through all the cases where we'd want to not show the survey:
  // 1. If the survey is disabled, abort mission, don't bother checking the other settings.
  // 2. If the user has already responded to the survey, check if enough time has passed since the last response.
  // 3. If the user has dismissed the survey twice or more before, check if enough time has passed since the last dismissal.
  // 4. If the user has only dismissed the survey once before, check if enough time has passed since the first dismissal.
  // If none of these cases check out, then we show the survey.
  // Note that submitting a response resets the dismissal counts.
  // Checks 3 and 4 should not be reversed, since the first dismissal will also exist if the user has dismissed the survey twice or more before.

  // User hasn't enabled NPS feature
  if (!enabled) {
    return false;
  }

  // The user has already responded to the survey
  if (lastResponseDate) {
    const timeSinceLastResponse = Date.now() - new Date(lastResponseDate).getTime();

    if (timeSinceLastResponse >= delays.postResponse) {
      return true;
    }

    return false;
  }

  // The user has dismissed the survey twice or more before
  if (lastDismissalDate) {
    const timeSinceLastDismissal = Date.now() - new Date(lastDismissalDate).getTime();

    if (timeSinceLastDismissal >= delays.postSubsequentDismissal) {
      return true;
    }

    return false;
  }

  // The user has only dismissed the survey once before
  if (firstDismissalDate) {
    const timeSinceFirstDismissal = Date.now() - new Date(firstDismissalDate).getTime();

    if (timeSinceFirstDismissal >= delays.postFirstDismissal) {
      return true;
    }

    return false;
  }

  // The user has not interacted with the survey before
  return true;
};

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

const NpsSurvey = () => {
  const { npsSurveySettings, setNpsSurveySettings } = useNpsSurveySettings();

  // Only check on first render if the survey should be shown
  const [surveyIsShown, setSurveyIsShown] = React.useState(
    checkIfShouldShowSurvey(npsSurveySettings)
  );

  // Set a cooldown to show the survey
  const [showSurvey, setShowSurvey] = React.useState(false);

  React.useEffect(() => {
    const cooldown = setTimeout(() => {
      setShowSurvey(true);
    }, delays.cooldown);

    return () => {
      clearTimeout(cooldown);
    };
  }, []);

  if (!showSurvey) {
    return null;
  }

  if (!surveyIsShown) {
    return null;
  }

  const handleSubmitResponse = () => {
    setNpsSurveySettings((settings) => ({
      ...settings,
      lastResponseDate: new Date(),
      firstDismissalDate: null,
      lastDismissalDate: null,
    }));
    // TODO: send response to the backend
    setSurveyIsShown(false);
  };

  const handleDismiss = () => {
    setNpsSurveySettings((settings) => {
      const nextSettings = {
        ...settings,
        lastResponseDate: null,
      };

      if (settings.firstDismissalDate) {
        // If the user dismisses the survey for the second time
        nextSettings.lastDismissalDate = new Date();
      } else {
        // If the user dismisses the survey for the first time
        nextSettings.firstDismissalDate = new Date();
      }

      return nextSettings;
    });

    setSurveyIsShown(false);
  };

  // TODO: replace with the proper UI
  return (
    <Flex gap={2} padding={2}>
      <Typography>NPS SURVEY</Typography>
      <Button onClick={handleDismiss}>Dismiss</Button>
      <Button onClick={handleSubmitResponse}>Submit</Button>
    </Flex>
  );
};

export default NpsSurvey;
