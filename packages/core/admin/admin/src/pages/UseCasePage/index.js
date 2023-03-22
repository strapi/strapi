import React, { useState } from 'react';
import axios from 'axios';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { parse } from 'qs';
import { pxToRem, useNotification, auth } from '@strapi/helper-plugin';
import {
  Main,
  Flex,
  Box,
  Typography,
  Select,
  Option,
  TextInput,
  TextButton,
  Button,
} from '@strapi/design-system';
import Logo from '../../components/UnauthenticatedLogo';
import UnauthenticatedLayout, { LayoutContent } from '../../layouts/UnauthenticatedLayout';

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

const TypographyCenter = styled(Typography)`
  text-align: center;
`;

const UseCasePage = () => {
  const toggleNotification = useNotification();
  const { push, location } = useHistory();
  const { formatMessage } = useIntl();
  const [role, setRole] = useState();
  const [otherRole, setOtherRole] = useState('');
  const { firstname, email } = auth.getUserInfo();
  const { hasAdmin } = parse(location?.search, { ignoreQueryPrefix: true });
  const isOther = role === 'other';

  const handleSubmit = (skipPersona) => {
    try {
      axios({
        method: 'POST',
        url: 'https://analytics.strapi.io/register',
        data: {
          email,
          username: firstname,
          firstAdmin: Boolean(!hasAdmin),
          persona: {
            role: skipPersona ? undefined : role,
            otherRole: skipPersona ? undefined : otherRole,
          },
        },
      });

      toggleNotification({
        type: 'success',
        message: {
          id: 'Usecase.notification.success.project-created',
          defaultMessage: 'Project has been successfully created',
        },
      });
      push('/');
    } catch (err) {
      // Silent
    }
  };

  return (
    <UnauthenticatedLayout>
      <Main labelledBy="usecase-title">
        <LayoutContent>
          <form onSubmit={() => handleSubmit(false)}>
            <Flex direction="column" paddingBottom={7}>
              <Logo />
              <Box paddingTop={6} paddingBottom={1} width={pxToRem(250)}>
                <TypographyCenter variant="alpha" as="h1" id="usecase-title">
                  {formatMessage({
                    id: 'Usecase.title',
                    defaultMessage: 'Tell us a bit more about yourself',
                  })}
                </TypographyCenter>
              </Box>
            </Flex>
            <Flex direction="column" alignItems="stretch" gap={6}>
              <Select
                id="usecase"
                data-testid="usecase"
                label={formatMessage({
                  id: 'Usecase.input.work-type',
                  defaultMessage: 'What type of work do you do?',
                })}
                // onClear={() => setRole(null)}
                // clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
                onChange={setRole}
                value={role}
              >
                {options.map(({ intlLabel, value }) => (
                  <Option key={value} value={value}>
                    {formatMessage(intlLabel)}
                  </Option>
                ))}
              </Select>
              {isOther && (
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
          </form>
        </LayoutContent>
        <Flex justifyContent="center">
          <Box paddingTop={4}>
            <TextButton onClick={() => handleSubmit(true)}>
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

export default UseCasePage;
