import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  Main,
  SingleSelectOption,
  SingleSelect,
  TextButton,
  TextInput,
  Typography,
  Field,
} from '@strapi/design-system';
import { parse } from 'qs';
import { useIntl } from 'react-intl';
import { useLocation, useNavigate } from 'react-router-dom';

import { PrivateRoute } from '../components/PrivateRoute';
import { Logo } from '../components/UnauthenticatedLogo';
import { useAuth } from '../features/Auth';
import { useNotification } from '../features/Notifications';
import { LayoutContent, UnauthenticatedLayout } from '../layouts/UnauthenticatedLayout';

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

const UseCasePage = () => {
  const { toggleNotification } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const [role, setRole] = React.useState<string | number | null>(null);
  const [otherRole, setOtherRole] = React.useState('');

  const { firstname, email } = useAuth('UseCasePage', (state) => state.user) ?? {};
  const { hasAdmin } = parse(location.search, { ignoreQueryPrefix: true });
  const isOther = role === 'other';

  const handleSubmit = async (event: React.FormEvent, skipPersona: boolean) => {
    event.preventDefault();
    try {
      await fetch('https://analytics.strapi.io/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username: firstname,
          firstAdmin: Boolean(!hasAdmin),
          persona: {
            role: skipPersona ? undefined : role,
            otherRole: skipPersona ? undefined : otherRole,
          },
        }),
      });

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'Usecase.notification.success.project-created',
          defaultMessage: 'Project has been successfully created',
        }),
      });
      navigate('/');
    } catch (err) {
      // Silent
    }
  };

  return (
    <UnauthenticatedLayout>
      <Main labelledBy="usecase-title">
        <LayoutContent>
          <form onSubmit={(e) => handleSubmit(e, false)}>
            <Flex direction="column" paddingBottom={7}>
              <Logo />
              <Box paddingTop={6} paddingBottom={1} width={`25rem`}>
                <Typography textAlign="center" variant="alpha" tag="h1" id="usecase-title">
                  {formatMessage({
                    id: 'Usecase.title',
                    defaultMessage: 'Tell us a bit more about yourself',
                  })}
                </Typography>
              </Box>
            </Flex>
            <Flex direction="column" alignItems="stretch" gap={6}>
              <Field.Root name="usecase">
                <Field.Label>
                  {formatMessage({
                    id: 'Usecase.input.work-type',
                    defaultMessage: 'What type of work do you do?',
                  })}
                </Field.Label>
                <SingleSelect onChange={(value) => setRole(value)} value={role}>
                  {options.map(({ intlLabel, value }) => (
                    <SingleSelectOption key={value} value={value}>
                      {formatMessage(intlLabel)}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Field.Root>
              {isOther && (
                <Field.Root name="other">
                  <Field.Label>
                    {formatMessage({ id: 'Usecase.other', defaultMessage: 'Other' })}
                  </Field.Label>
                  <TextInput value={otherRole} onChange={(e) => setOtherRole(e.target.value)} />
                </Field.Root>
              )}
              <Button type="submit" size="L" fullWidth disabled={!role}>
                {formatMessage({ id: 'global.finish', defaultMessage: 'Finish' })}
              </Button>
            </Flex>
          </form>
        </LayoutContent>
        <Flex justifyContent="center">
          <Box paddingTop={4}>
            <TextButton
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => handleSubmit(event, true)}
            >
              {formatMessage({
                id: 'Usecase.button.skip',
                defaultMessage: 'Skip this question',
              })}
            </TextButton>
          </Box>
        </Flex>
      </Main>
    </UnauthenticatedLayout>
  );
};

const PrivateUseCasePage = () => {
  return (
    <PrivateRoute>
      <UseCasePage />
    </PrivateRoute>
  );
};

export { PrivateUseCasePage, UseCasePage };
