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
  VisuallyHidden,
} from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { Formik, Form } from 'formik';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';
import * as yup from 'yup';

import { useAppInfo } from '../features/AppInfo';
import { useAuth } from '../features/Auth';
import { useNotification } from '../features/Notifications';
import { usePersistentState } from '../hooks/usePersistentState';

const FieldWrapper = styled(Field.Root)`
  height: 3.2rem;
  width: 3.2rem;

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
  postFirstDismissal: 14 * 24 * 60 * 60 * 1000, // 14 days in ms
  postSubsequentDismissal: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
  display: 30 * 60 * 1000, // 30 minutes in ms
};

const ratingArray = [...Array(11).keys()];

const checkIfShouldShowSurvey = (settings: NpsSurveySettings) => {
  const { enabled, lastResponseDate, firstDismissalDate, lastDismissalDate } = settings;

  // This function goes through all the cases where we'd want to not show the survey:
  // 1. If the survey is disabled by strapi, abort mission, don't bother checking the other settings.
  // 2. If the survey is disabled by user, abort mission, don't bother checking the other settings.
  // 3. If the user has already responded to the survey, check if enough time has passed since the last response.
  // 4. If the user has dismissed the survey twice or more before, check if enough time has passed since the last dismissal.
  // 5. If the user has only dismissed the survey once before, check if enough time has passed since the first dismissal.
  // If none of these cases check out, then we show the survey.
  // Note that submitting a response resets the dismissal counts.
  // Checks 4 and 5 should not be reversed, since the first dismissal will also exist if the user has dismissed the survey twice or more before.

  // For users who had created an account before the NPS feature was introduced,
  // we assume that they would have enabled the NPS feature if they had the chance.

  // Global strapi disable for NSP.
  if (window.strapi.flags.nps === false) {
    return false;
  }

  // User chose not to enable the NPS feature when signing up
  if (enabled === false) {
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
  const { toggleNotification } = useNotification();
  const currentEnvironment = useAppInfo('NpsSurvey', (state) => state.currentEnvironment);
  const strapiVersion = useAppInfo('NpsSurvey', (state) => state.strapiVersion);

  interface NpsSurveyMutationBody {
    email: string;
    rating: number | null;
    comment: string;
    environment?: string;
    version?: string;
    license: 'Enterprise' | 'Community';
  }

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

  const { user } = useAuth('NpsSurvey', (auth) => auth);

  if (!displaySurvey) {
    return null;
  }

  if (!surveyIsShown) {
    return null;
  }

  const handleSubmitResponse = async ({
    npsSurveyRating,
    npsSurveyFeedback,
  }: {
    npsSurveyRating: NpsSurveyMutationBody['rating'];
    npsSurveyFeedback: NpsSurveyMutationBody['comment'];
  }) => {
    try {
      const body = {
        email: typeof user === 'object' && user.email ? user.email : '',
        rating: npsSurveyRating,
        comment: npsSurveyFeedback,
        environment: currentEnvironment,
        version: strapiVersion ?? undefined,
        license: window.strapi.projectType,
      };
      const res = await fetch('https://analytics.strapi.io/submit-nps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error('Failed to submit NPS survey');
      }

      setNpsSurveySettings((settings) => ({
        ...settings,
        lastResponseDate: new Date().toString(),
        firstDismissalDate: null,
        lastDismissalDate: null,
      }));
      setIsFeedbackResponse(true);
      // Thank you message displayed in the banner should disappear after few seconds.
      setTimeout(() => {
        setSurveyIsShown(false);
      }, 3000);
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  const handleDismiss = () => {
    setNpsSurveySettings((settings) => {
      const nextSettings = {
        ...settings,
        lastResponseDate: null,
      };

      if (settings.firstDismissalDate) {
        // If the user dismisses the survey for the second time
        nextSettings.lastDismissalDate = new Date().toString();
      } else {
        // If the user dismisses the survey for the first time
        nextSettings.firstDismissalDate = new Date().toString();
      }

      return nextSettings;
    });

    setSurveyIsShown(false);
  };

  return (
    <Portal>
      <Formik
        initialValues={{ npsSurveyFeedback: '', npsSurveyRating: null }}
        onSubmit={handleSubmitResponse}
        validationSchema={yup.object({
          npsSurveyFeedback: yup.string(),
          npsSurveyRating: yup.number().required(),
        })}
      >
        {({ values, handleChange, setFieldValue, isSubmitting }) => (
          <Form name="npsSurveyForm">
            <Flex
              hasRadius
              direction="column"
              padding={4}
              borderColor="primary200"
              background="neutral0"
              shadow="popupShadow"
              position="fixed"
              bottom={0}
              left="50%"
              transform="translateX(-50%)"
              zIndex="200"
              width="50%"
            >
              {isFeedbackResponse ? (
                <Typography fontWeight="semiBold">
                  {formatMessage({
                    id: 'app.components.NpsSurvey.feedback-response',
                    defaultMessage: 'Thank you very much for your feedback!',
                  })}
                </Typography>
              ) : (
                <Box tag="fieldset" width="100%" borderWidth={0}>
                  <Flex justifyContent="space-between" width="100%">
                    <Box marginLeft="auto" marginRight="auto">
                      <Typography fontWeight="semiBold" tag="legend">
                        {formatMessage({
                          id: 'app.components.NpsSurvey.banner-title',
                          defaultMessage:
                            'How likely are you to recommend Strapi to a friend or colleague?',
                        })}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={handleDismiss}
                      withTooltip={false}
                      label={formatMessage({
                        id: 'app.components.NpsSurvey.dismiss-survey-label',
                        defaultMessage: 'Dismiss survey',
                      })}
                    >
                      <Cross />
                    </IconButton>
                  </Flex>
                  <Flex gap={2} marginTop={2} marginBottom={2} justifyContent="center">
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
                          name="npsSurveyRating"
                          className={values.npsSurveyRating === number ? 'selected' : undefined} // "selected" class added when child radio button is checked
                          hasRadius
                          background="primary100"
                          borderColor="primary200"
                          color="primary600"
                          position="relative"
                          cursor="pointer"
                        >
                          <Field.Label>
                            <VisuallyHidden>
                              <Field.Input
                                type="radio"
                                checked={values.npsSurveyRating === number}
                                onChange={(e) =>
                                  setFieldValue('npsSurveyRating', parseInt(e.target.value, 10))
                                }
                                value={number}
                              />
                            </VisuallyHidden>
                            {number}
                          </Field.Label>
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
                  {values.npsSurveyRating !== null && (
                    <Flex direction="column">
                      <Box marginTop={2}>
                        <Field.Label fontWeight="semiBold" fontSize={2}>
                          {formatMessage({
                            id: 'app.components.NpsSurvey.feedback-question',
                            defaultMessage: 'Do you have any suggestion for improvements?',
                          })}
                        </Field.Label>
                      </Box>
                      <Box width="62%" marginTop={3} marginBottom={4}>
                        <Textarea
                          id="npsSurveyFeedback" // formik element attribute "id" should be same as the values key to work
                          width="100%"
                          onChange={handleChange}
                          value={values.npsSurveyFeedback}
                        />
                      </Box>
                      <Button marginBottom={2} type="submit" loading={isSubmitting}>
                        {formatMessage({
                          id: 'app.components.NpsSurvey.submit-feedback',
                          defaultMessage: 'Submit Feedback',
                        })}
                      </Button>
                    </Flex>
                  )}
                </Box>
              )}
            </Flex>
          </Form>
        )}
      </Formik>
    </Portal>
  );
};

interface NpsSurveySettings {
  enabled: boolean;
  lastResponseDate: string | null;
  firstDismissalDate: string | null;
  lastDismissalDate: string | null;
}

/**
 * We exported to make it available during admin user registration.
 * Because we only enable the NPS for users who subscribe to the newsletter when signing up
 */
function useNpsSurveySettings() {
  const [npsSurveySettings, setNpsSurveySettings] = usePersistentState<NpsSurveySettings>(
    'STRAPI_NPS_SURVEY_SETTINGS',
    {
      enabled: true,
      lastResponseDate: null,
      firstDismissalDate: null,
      lastDismissalDate: null,
    }
  );

  /**
   * TODO: should this just be an array so we can alias the `usePersistentState` hook?
   */
  return { npsSurveySettings, setNpsSurveySettings };
}

export { NpsSurvey, useNpsSurveySettings };
