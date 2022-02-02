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
import { Link } from '@strapi/design-system/Link';
import { Button } from '@strapi/design-system/Button';
import Logo from '../AuthPage/components/Logo';
import UnauthenticatedLayout, { LayoutContent } from '../../layouts/UnauthenticatedLayout';

export const options = [
  'Front-end developer',
  'Back-end developer',
  'Full-stack developer',
  'Content Manager',
  'Content Creator',
  'Other',
];

const TypographyCenter = styled(Typography)`
  text-align: center;
`;

const UsecasePage = () => {
  const toggleNotification = useNotification();
  const { push, location } = useHistory();
  const { formatMessage } = useIntl();
  const [workType, setWorkType] = useState();
  const [otherValue, setOtherValue] = useState();

  const isOther = workType === 'Other';
  const isComingFromRegister = location.state?.fromRegister;

  const CancelToken = axios.CancelToken;
  const source = CancelToken.source();

  useEffect(() => {
    // Cancel request on unmount
    return () => {
      source.cancel('Component unmounted');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isComingFromRegister) {
      push('/');
    }
  }, [isComingFromRegister, push]);

  const handleSubmit = () => {
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
          workType,
          otherValue,
        },
        cancelToken: source.token,
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

  if (!isComingFromRegister) {
    return null;
  }

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <form onSubmit={handleSubmit}>
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
                onClear={() => setWorkType(null)}
                clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
                onChange={setWorkType}
                value={workType}
              >
                {options.map(option => (
                  <Option key={option} value={option}>
                    {option}
                  </Option>
                ))}
              </Select>
              {isOther && (
                <TextInput
                  name="other"
                  label={formatMessage({ id: 'Usecase.input.other', defaultMessage: 'Other' })}
                  value={otherValue}
                  onChange={e => setOtherValue(e.target.value)}
                  data-testid="other"
                />
              )}
              <Button type="submit" size="L" fullWidth onClick={handleSubmit}>
                {formatMessage({ id: 'form.button.finish', defaultMessage: 'Finish' })}
              </Button>
            </Stack>
          </form>
        </LayoutContent>
        <Flex justifyContent="center">
          <Box paddingTop={4}>
            <Link to="/">
              {formatMessage({
                id: 'Usecase.button.skip',
                defaultMessage: 'Skip this question',
              })}
            </Link>
          </Box>
        </Flex>
      </Main>
    </UnauthenticatedLayout>
  );
};

export default UsecasePage;
