import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { pxToRem, useNotification } from '@strapi/helper-plugin';
import { Main } from '@strapi/design-system/Main';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { Select, Option } from '@strapi/design-system/Select';
import { TextInput } from '@strapi/design-system/TextInput';
import { TextButton } from '@strapi/design-system/TextButton';
import { Button } from '@strapi/design-system/Button';
import Logo from '../../components/UnauthenticatedLogo';
import UnauthenticatedLayout, { LayoutContent } from '../../layouts/UnauthenticatedLayout';

export const options = [
  { label: 'Front-end developer', value: 'front_end_developer' },
  { label: 'Back-end developer', value: 'back_end_developer' },
  { label: 'Full-stack developer', value: 'full_stack_developer' },
  { label: 'Content Manager', value: 'content_manager' },
  { label: 'Content Creator', value: 'content_creator' },
  { label: 'Other', value: 'other' },
];

const TypographyCenter = styled(Typography)`
  text-align: center;
`;

const UsecasePage = () => {
  const toggleNotification = useNotification();
  const { push, location } = useHistory();
  const { formatMessage } = useIntl();
  const [role, setRole] = useState();
  const [otherRole, setOtherRole] = useState('');

  const isOther = role === 'other';
  const isComingFromRegister = location.state?.fromRegister;

  useEffect(() => {
    if (!isComingFromRegister) {
      push('/');
    }
  }, [isComingFromRegister, push]);

  const handleSubmit = skipPersona => {
    try {
      const {
        state: { email, firstAdmin, firstname },
      } = location;

      axios({
        method: 'POST',
        url: 'https://analytics.strapi.io/register',
        data: {
          email,
          username: firstname,
          firstAdmin,
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
      <Main>
        <LayoutContent>
          <form onSubmit={() => handleSubmit(false)}>
            <Flex direction="column" paddingBottom={7}>
              <Logo />
              <Box paddingTop={6} paddingBottom={1} width={pxToRem(250)}>
                <TypographyCenter variant="alpha" as="h1">
                  {formatMessage({
                    id: 'Usecase.title',
                    defaultMessage: 'Tell us a bit more about yourself?',
                  })}
                </TypographyCenter>
              </Box>
            </Flex>
            <Stack size={6}>
              <Select
                id="usecase"
                data-testid="usecase"
                label={formatMessage({
                  id: 'Usecase.input.work-type',
                  defaultMessage: 'What type of work do you do?',
                })}
                onClear={() => setRole(null)}
                clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
                onChange={setRole}
                value={role}
              >
                {options.map(({ label, value }) => (
                  <Option key={value} value={value}>
                    {label}
                  </Option>
                ))}
              </Select>
              {isOther && (
                <TextInput
                  name="other"
                  label={formatMessage({ id: 'Usecase.input.other', defaultMessage: 'Other' })}
                  value={otherRole}
                  onChange={e => setOtherRole(e.target.value)}
                  data-testid="other"
                />
              )}
              <Button type="submit" size="L" fullWidth>
                {formatMessage({ id: 'form.button.finish', defaultMessage: 'Finish' })}
              </Button>
            </Stack>
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

export default UsecasePage;
