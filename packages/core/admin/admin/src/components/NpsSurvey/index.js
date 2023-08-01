import * as React from 'react';

import {
  Box,
  Flex,
  IconButton,
  Button,
  Typography,
  Textarea,
  Portal,
  Field,
  FieldLabel,
  FieldInput,
  VisuallyHidden,
} from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { Formik, Form } from 'formik';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import * as yup from 'yup';

import { useNpsSurveySettings } from './hooks/useNpsSurveySettings';

const BannerWrapper = styled(Flex)`
  border: 1px solid ${({ theme }) => theme.colors.primary200};
  background: ${({ theme }) => theme.colors.neutral0};
  box-shadow: ${({ theme }) => theme.shadows.popupShadow};
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: ${({ theme }) => theme.zIndices[2]};
  width: 50%;
`;

const Header = styled(Box)`
  margin: 0 auto;
`;

const FieldWrapper = styled(Field)`
  height: ${32 / 16}rem;
  width: ${32 / 16}rem;
  border-radius: ${({ theme }) => theme.spaces[1]};
  background-color: ${({ theme }) => theme.colors.primary100};
  border: 1px solid ${({ theme }) => theme.colors.primary200};
  color: ${({ theme }) => theme.colors.primary600};
  position: relative;
  cursor: pointer;

  > label,
  ~ input {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  > label {
    color: inherit;
    cursor: pointer;
    padding: ${({ theme }) => theme.spaces[2]};
    text-align: center;
    vertical-align: middle;
  }

  &:hover,
  &:focus-within {
    background-color: ${({ theme }) => theme.colors.neutral0};
  }

  &:active,
  &.selected {
    color: ${({ theme }) => theme.colors.primary700};
    background-color: ${({ theme }) => theme.colors.neutral0};
    border-color: ${({ theme }) => theme.colors.primary700};
  }
`;

const delays = {
  postResponse: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
  postFirstDismissal: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  postSubsequentDismissal: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
  display: 5 * 60 * 1000, // 5 minutes in ms
};

const ratingArray = [...Array(11).keys()];

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
  const [isFeedbackResponse, setIsFeedbackResponse] = React.useState(false);

  // Only check on first render if the survey should be shown
  const [surveyIsShown, setSurveyIsShown] = React.useState(
    checkIfShouldShowSurvey(npsSurveySettings)
  );

  // Set a cooldown to show the survey when session begins
  const [displaySurvey, setDisplaySurvey] = React.useState(false);

  React.useEffect(() => {
    const displayTime = setTimeout(() => {
      setDisplaySurvey(true);
    }, delays.display);

    return () => {
      clearTimeout(displayTime);
    };
  }, []);

  if (!displaySurvey) {
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
    setIsFeedbackResponse(true);

    setTimeout(() => {
      setSurveyIsShown(false);
    }, 3000);
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

  return (
    <Portal>
      <Formik
        initialValues={{ feedback: '', selectedRating: null }}
        onSubmit={handleSubmitResponse}
        validationSchema={yup.object({
          feedback: yup.string(),
          selectedRating: yup.number(),
        })}
      >
        {({ handleSubmit, values, handleChange, setFieldValue }) => (
          <Form name="npsSurveyForm" noValidate onSubmit={handleSubmit}>
            <BannerWrapper hasRadius direction="column" padding={4}>
              {isFeedbackResponse ? (
                <Typography fontWeight="semiBold">
                  {formatMessage({
                    id: 'app.components.NpsSurvey.feedback-response',
                    defaultMessage: 'Thank you very much for your feedback!',
                  })}
                </Typography>
              ) : (
                <>
                  <Flex justifyContent="space-between" width="100%">
                    <Header>
                      <Typography fontWeight="semiBold">
                        {formatMessage({
                          id: 'app.components.NpsSurvey.banner-title',
                          defaultMessage:
                            'How likely are you to recommend Strapi to a friend or colleague?',
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
                  <Flex gap={2} marginLeft={8} marginRight={8} marginTop={2} marginBottom={2}>
                    <Typography variant="pi" textColor="neutral600">
                      {formatMessage({
                        id: 'app.components.NpsSurvey.no-recommendation',
                        defaultMessage: 'Not at all likely',
                      })}
                    </Typography>
                    {ratingArray.map((number) => {
                      return (
                        <FieldWrapper
                          key={number}
                          className={values.selectedRating === number ? 'selected' : null}
                        >
                          <FieldLabel htmlFor={number} id={`${number}-rating`}>
                            <VisuallyHidden>
                              <FieldInput
                                type="radio"
                                id={number}
                                name="selectedRating"
                                checked={values.selectedRating === number}
                                onChange={() => setFieldValue('selectedRating', number)}
                                value={number}
                                aria-checked={values.selectedRating === number}
                                aria-labelledby={`${number}-rating`}
                              />
                            </VisuallyHidden>
                            {number}
                          </FieldLabel>
                        </FieldWrapper>
                      );
                    })}
                    <Typography variant="pi" textColor="neutral600">
                      {formatMessage({
                        id: 'app.components.NpsSurvey.happy-to-recommend',
                        defaultMessage: 'Extremely likely',
                      })}
                    </Typography>
                  </Flex>
                  {(values.selectedRating || values.selectedRating === 0) && (
                    <>
                      <Box marginTop={2}>
                        <Typography fontWeight="semiBold">
                          {formatMessage({
                            id: 'app.components.NpsSurvey.feedback-question',
                            defaultMessage: 'Do you have any suggestion for improvements?',
                          })}
                        </Typography>
                      </Box>
                      <Box width="62%" marginTop={3} marginBottom={4}>
                        <Textarea
                          id="feedback"
                          name="feedback"
                          width="100%"
                          value={values.feedback}
                          onChange={handleChange}
                        >
                          {values.feedback}
                        </Textarea>
                      </Box>
                      <Button marginBottom={2} type="submit">
                        {formatMessage({
                          id: 'app.components.NpsSurvey.submit-feedback',
                          defaultMessage: 'Submit Feedback',
                        })}
                      </Button>
                    </>
                  )}
                </>
              )}
            </BannerWrapper>
          </Form>
        )}
      </Formik>
    </Portal>
  );
};

export default NpsSurvey;
