import * as React from 'react';

import { Flex, Button, Typography } from '@strapi/design-system';

export const npsStorageKeys = {
  enabled: 'NPS_SURVEY_ENABLED',
  lastResponseDate: 'NPS_SURVEY_LAST_RESPONSE_DATE',
  firstDismissalDate: 'NPS_SURVEY_FIRST_DISMISSAL_DATE',
  lastDismissalDate: 'NPS_SURVEY_LAST_DISMISSAL_DATE',
};

const delays = {
  postResponse: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
  postFirstDismissal: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  postSubsequentDismissal: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
};

const getLocalStorageDate = (key) => {
  const value = window.localStorage.getItem(key);

  if (!value) {
    return null;
  }

  return new Date(parseInt(value, 10));
};

const setLocalStorageDate = (key, date) => {
  if (date == null) {
    window.localStorage.removeItem(key);

    return;
  }

  window.localStorage.setItem(key, date.getTime().toString());
};

const checkIfShouldShowSurvey = ({ lastResponseDate, firstDismissalDate, lastDismissalDate }) => {
  if (window.localStorage.getItem(npsStorageKeys.enabled) !== 'true') {
    return false;
  }

  if (lastResponseDate) {
    // If the user has already responded to the survey
    const timeSinceLastResponse = Date.now() - lastResponseDate.getTime();

    if (timeSinceLastResponse >= delays.postResponse) {
      return true;
    }

    return false;
  }

  if (lastDismissalDate) {
    // If the user has dismissed the survey twice or more before
    const timeSinceLastDismissal = Date.now() - lastDismissalDate.getTime();

    if (timeSinceLastDismissal >= delays.postSubsequentDismissal) {
      return true;
    }

    return false;
  }

  if (firstDismissalDate) {
    // If the user has dismissed the survey before
    const timeSinceFirstDismissal = Date.now() - firstDismissalDate.getTime();

    if (timeSinceFirstDismissal >= delays.postFirstDismissal) {
      return true;
    }

    return false;
  }

  // If the user has not interacted with the survey before
  return true;
};

const NpsSurvey = () => {
  // Get timestamps from local storage
  const lastResponseDate = getLocalStorageDate(npsStorageKeys.lastResponseDate);
  const firstDismissalDate = getLocalStorageDate(npsStorageKeys.firstDismissalDate);
  const lastDismissalDate = getLocalStorageDate(npsStorageKeys.lastDismissalDate);

  // Only check on first render if the survey should be shown
  const [surveyIsShown, setSurveyIsShown] = React.useState(
    checkIfShouldShowSurvey({
      lastResponseDate,
      firstDismissalDate,
      lastDismissalDate,
    })
  );

  if (!surveyIsShown) {
    return null;
  }

  const handleSubmitResponse = () => {
    setLocalStorageDate(npsStorageKeys.lastResponseDate, new Date());
    setLocalStorageDate(npsStorageKeys.firstDismissalDate, null);
    setLocalStorageDate(npsStorageKeys.lastDismissalDate, null);
    // TODO: send response to the backend
    setSurveyIsShown(false);
  };

  const handleDismiss = () => {
    if (firstDismissalDate) {
      // If the user dismisses the survey for the second time
      setLocalStorageDate(npsStorageKeys.lastDismissalDate, new Date());
    } else {
      // If the user dismisses the survey for the first time
      setLocalStorageDate(npsStorageKeys.firstDismissalDate, new Date());
    }

    setLocalStorageDate(npsStorageKeys.lastResponseDate, null);
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
