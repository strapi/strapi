import * as React from 'react';

import {
  Button,
  Flex,
  Main,
  Option,
  Select,
  TextButton,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { auth, useNotification } from '@strapi/helper-plugin';
import { parse } from 'qs';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';

import Logo from '../components/UnauthenticatedLogo';
import UnauthenticatedLayout, { LayoutContent } from '../layouts/UnauthenticatedLayout';

export const options = [
  {
    intlLabel: {
      id: 'Usecase.front-end',
      defaultMessage: 'Front-end developer',
    },
    value: 'front_end_developer',
  },
  {
    intlLabel: {
      id: 'Usecase.back-end',
      defaultMessage: 'Back-end developer',
    },
    value: 'back_end_developer',
  },
  {
    intlLabel: {
      id: 'Usecase.full-stack',
      defaultMessage: 'Full-stack developer',
    },
    value: 'full_stack_developer',
  },
  {
    intlLabel: {
      id: 'global.content-manager',
      defaultMessage: 'Content Manager',
    },
    value: 'content_manager',
  },
  {
    intlLabel: {
      id: 'Usecase.content-creator',
      defaultMessage: 'Content Creator',
    },
    value: 'content_creator',
  },
  {
    intlLabel: {
      id: 'Usecase.other',
      defaultMessage: 'Other',
    },
    value: 'other',
  },
];

export const UseCasePage = () => {
  const toggleNotification = useNotification();
  const { push, location } = useHistory();
  const { formatMessage } = useIntl();
  const [role, setRole] = React.useState();
  const [otherRole, setOtherRole] = React.useState('');

  const { firstname, email } = auth.getUserInfo();
  const { hasAdmin } = parse(location?.search, { ignoreQueryPrefix: true });

  const handleSubmit = async (event) => {
    event.preventDefault();

    const shouldSkip = event.nativeEvent?.submitter?.name === 'skip';

    await fetch('https://analytics.strapi.io/register', {
      body: JSON.stringify({
        email,
        username: firstname,
        firstAdmin: Boolean(!hasAdmin),
        persona: {
          role: shouldSkip ? undefined : role,
          otherRole: shouldSkip ? undefined : otherRole,
        },
      }),

      headers: {
        'Content-Type': 'application/json',
      },

      method: 'POST',
    });

    toggleNotification({
      type: 'success',
      message: {
        id: 'Usecase.notification.success.project-created',
        defaultMessage: 'Project has been successfully created',
      },
    });

    push('/');
  };

  return (
    <UnauthenticatedLayout>
      <Main labelledBy="usecase-title">
        <form onSubmit={handleSubmit}>
          <LayoutContent>
            <Flex direction="column" alignItems="stretch" gap={7}>
              <Flex direction="column" gap={6}>
                <Logo />

                <Typography textAlign="center" variant="alpha" as="h1" id="usecase-title">
                  {formatMessage({
                    id: 'Usecase.title',
                    defaultMessage: 'Tell us a bit more about yourself',
                  })}
                </Typography>
              </Flex>

              <Flex direction="column" alignItems="stretch" gap={6}>
                <Select
                  id="usecase"
                  data-testid="usecase"
                  label={formatMessage({
                    id: 'Usecase.input.work-type',
                    defaultMessage: 'What type of work do you do?',
                  })}
                  onChange={setRole}
                  value={role}
                >
                  {options.map(({ intlLabel, value }) => (
                    <Option key={value} value={value}>
                      {formatMessage(intlLabel)}
                    </Option>
                  ))}
                </Select>

                {role === 'other' && (
                  <TextInput
                    name="other"
                    label={formatMessage({ id: 'Usecase.other', defaultMessage: 'Other' })}
                    value={otherRole}
                    onChange={(e) => setOtherRole(e.target.value)}
                    data-testid="other"
                  />
                )}

                <Button type="submit" size="L" fullWidth disabled={!role}>
                  {formatMessage({ id: 'global.finish', defaultMessage: 'Finish' })}
                </Button>
              </Flex>
            </Flex>
          </LayoutContent>

          <Flex justifyContent="center" paddingTop={4}>
            <TextButton type="submit" name="skip">
              {formatMessage({
                id: 'Usecase.button.skip',
                defaultMessage: 'Skip this question',
              })}
            </TextButton>
          </Flex>
        </form>
      </Main>
    </UnauthenticatedLayout>
  );
};
