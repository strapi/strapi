import * as React from 'react';

import { Flex, Button, Typography } from '@strapi/design-system';
import { usePersistentState } from '@strapi/helper-plugin';

const delays = {
  postResponse: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
  postFirstDismissal: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  postSubsequentDismissal: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
};

const checkIfShouldShowSurvey = (settings) => {
  const { enabled, lastResponseDate, firstDismissalDate, lastDismissalDate } = settings;

  if (!enabled) {
    return false;
  }

  if (lastResponseDate) {
    // If the user has already responded to the survey
    const timeSinceLastResponse = Date.now() - new Date(lastResponseDate).getTime();

    if (timeSinceLastResponse >= delays.postResponse) {
      return true;
    }

    return false;
  }

  if (lastDismissalDate) {
    // If the user has dismissed the survey twice or more before
    const timeSinceLastDismissal = Date.now() - new Date(lastDismissalDate).getTime();

    if (timeSinceLastDismissal >= delays.postSubsequentDismissal) {
      return true;
    }

    return false;
  }

  if (firstDismissalDate) {
    // If the user has dismissed the survey before
    const timeSinceFirstDismissal = Date.now() - new Date(firstDismissalDate).getTime();

    if (timeSinceFirstDismissal >= delays.postFirstDismissal) {
      return true;
    }

    return false;
  }

  // If the user has not interacted with the survey before
  return true;
};

export function useNpsSurveySettings() {
  const [npsSurveySettings, setNpsSurveySettings] = usePersistentState('NPS_SURVEY_SETTINGS', {
    enabled: true,
    lastResponseDate: null,
    firstDismissalDate: null,
    lastDismissalDate: null,
  });

  return { npsSurveySettings, setNpsSurveySettings };
}

const NpsSurvey = () => {
  const { npsSurveySettings, setNpsSurveySettings } = useNpsSurveySettings();

  // Only check on first render if the survey should be shown
  const [surveyIsShown, setSurveyIsShown] = React.useState(
    checkIfShouldShowSurvey(npsSurveySettings)
  );

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
