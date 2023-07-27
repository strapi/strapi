import React, { useState } from 'react';

import { Box, Flex, IconButton, Button, Typography, Textarea } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useNpsSurveySettings } from './hooks/useNpsSurveySettings';

const BannerWrapper = styled(Flex)`
  border: 1px solid ${({ theme }) => theme.colors.primary200};
  background: ${({ theme }) => theme.colors.neutral0};
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  padding: ${({ theme }) => theme.spaces[5]};
  flex-direction: column;
  gap: ${({ theme }) => theme.spaces[3]};
  position: fixed;
  bottom: 0;
  left: 50%;
  -webkit-transform: translateX(-50%);
  transform: translateX(-50%);
  z-index: 999;
`;

const Header = styled(Box)`
  margin: 0 auto;
`;

const RatingButtonWrapper = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: center;
  height: ${32 / 16}rem;
  width: ${32 / 16}rem;
  padding: ${({ theme }) => theme.spaces[2]};

  &.selected {
    background-color: ${({ theme }) => theme.colors.neutral0};
    border-color: ${({ theme }) => theme.colors.primary700};
  }
`;

const delays = {
  postResponse: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
  postFirstDismissal: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  postSubsequentDismissal: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
};

const ratingArray = Array.from(Array(11).keys());

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

const NpsSurvey = () => {
  const { formatMessage } = useIntl();
  const { npsSurveySettings, setNpsSurveySettings } = useNpsSurveySettings();
  const [feedback, setFeedback] = useState(null);
  const [showFeedbackBox, setShowFeedbackBox] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);

  // Only check on first render if the survey should be shown
  const [surveyIsShown, setSurveyIsShown] = useState(checkIfShouldShowSurvey(npsSurveySettings));

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

  const onSelectRating = (number) => {
    setShowFeedbackBox(true);
    setSelectedRating(number);
  };

  return (
    <BannerWrapper hasRadius>
      <Flex justifyContent="space-between" width="100%">
        <Header>
          <Typography>
            {formatMessage({
              id: 'app.components.NpsSurvey.banner-title',
              defaultMessage: 'How likely are you to recommend Strapi to a friend or colleague?',
            })}
          </Typography>
        </Header>
        <IconButton
          onClick={handleDismiss}
          aria-label={formatMessage({
            id: 'app.components.NpsSurvey.dismiss-survey-label',
            defaultMessage: 'Dismiss survey',
          })}
          icon={<Cross />}
        />
      </Flex>
      <Flex gap={2} paddingLeft={8} paddingRight={8}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: 'app.components.NpsSurvey.no-recommendation',
            defaultMessage: 'Not at all likely',
          })}
        </Typography>
        {ratingArray.map((number) => {
          return (
            <RatingButtonWrapper
              key={number}
              variant="secondary"
              onClick={() => onSelectRating(number)}
              className={selectedRating === number ? `selected` : null}
            >
              {number}
            </RatingButtonWrapper>
          );
        })}
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: 'app.components.NpsSurvey.happy-to-recommend',
            defaultMessage: 'Extremely likely',
          })}
        </Typography>
      </Flex>
      {showFeedbackBox && (
        <Flex direction="column" gap={4} paddingTop={3}>
          <Typography>
            {formatMessage({
              id: 'app.components.NpsSurvey.feedback-question',
              defaultMessage: 'Do you have any suggestion for improvements?',
            })}
          </Typography>
          <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            width="432px"
          >
            {feedback}
          </Textarea>
          <Button onClick={handleSubmitResponse} disabled={!feedback}>
            {formatMessage({
              id: 'app.components.NpsSurvey.submit-feedback',
              defaultMessage: 'Submit Feedback',
            })}
          </Button>
        </Flex>
      )}
    </BannerWrapper>
  );
};

export default NpsSurvey;
