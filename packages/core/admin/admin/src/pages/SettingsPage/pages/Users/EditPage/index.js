import React from 'react';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import pick from 'lodash/pick';
import get from 'lodash/get';
import omit from 'lodash/omit';
import {
  Form,
  GenericInput,
  SettingsPageTitle,
  auth,
  useAppInfos,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  LoadingIndicatorPage,
  Link,
} from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import { Formik } from 'formik';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Typography } from '@strapi/design-system/Typography';
import { Main } from '@strapi/design-system/Main';
import { Stack } from '@strapi/design-system/Stack';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import Check from '@strapi/icons/Check';
import MagicLink from 'ee_else_ce/pages/SettingsPage/pages/Users/components/MagicLink';
import { formatAPIErrors, getFullName } from '../../../../../utils';
import { fetchUser, putUser } from './utils/api';
import layout from './utils/layout';
import { editValidation } from '../utils/validations/users';
import SelectRoles from '../components/SelectRoles';

const fieldsToPick = ['email', 'firstname', 'lastname', 'username', 'isActive', 'roles'];

const EditPage = ({ canUpdate }) => {
  const { formatMessage } = useIntl();
  const {
    params: { id },
  } = useRouteMatch('/settings/users/:id');
  const { push } = useHistory();
  const { setUserDisplayName } = useAppInfos();

  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  useFocusWhenNavigate();

  const { status, data } = useQuery(['user', id], () => fetchUser(id), {
    retry: false,
    keepPreviousData: false,
    staleTime: 1000 * 20,
    onError: err => {
      const status = err.response.status;

      // Redirect the use to the homepage if is not allowed to read
      if (status === 403) {
        toggleNotification({
          type: 'info',
          message: {
            id: 'notification.permission.not-allowed-read',
            defaultMessage: 'You are not allowed to see this document',
          },
        });

        push('/');
      }
      console.log(err.response.status);
    },
  });

  const handleSubmit = async (body, actions) => {
    lockApp();

    try {
      const data = await putUser(id, omit(body, 'confirmPassword'));

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
      });

      const userInfos = auth.getUserInfo();

      // The user is updating himself
      if (id.toString() === userInfos.id.toString()) {
        auth.setUserInfo(data);

        const userDisplayName = get(body, 'username') || getFullName(body.firstname, body.lastname);

        setUserDisplayName(userDisplayName);
      }
      actions.setValues(pick(body, fieldsToPick));
    } catch (err) {
      // FIXME when API errors are ready
      const errors = formatAPIErrors(err.response.data);
      const fieldsErrors = Object.keys(errors).reduce((acc, current) => {
        acc[current] = errors[current].id;

        return acc;
      }, {});

      actions.setErrors(fieldsErrors);
      toggleNotification({
        type: 'warning',
        message: get(err, 'response.data.message', 'notification.error'),
      });
    }

    unlockApp();
  };

  const isLoading = status !== 'success';
  const headerLabel = isLoading
    ? { id: 'app.containers.Users.EditPage.header.label-loading', defaultMessage: 'Edit user' }
    : { id: 'app.containers.Users.EditPage.header.label', defaultMessage: 'Edit {name}' };

  const initialData = Object.keys(pick(data, fieldsToPick)).reduce((acc, current) => {
    if (current === 'roles') {
      acc[current] = (data?.roles || []).map(({ id }) => id);

      return acc;
    }

    acc[current] = data?.[current];

    return acc;
  }, {});

  const headerLabelName =
    initialData.username || getFullName(initialData.firstname, initialData.lastname);

  const title = formatMessage(headerLabel, { name: headerLabelName });

  if (isLoading) {
    return (
      <Main aria-busy="true">
        <SettingsPageTitle name="Users" />
        <HeaderLayout
          primaryAction={
            <Button disabled startIcon={<Check />} type="button" size="L">
              {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
            </Button>
          }
          title={title}
          navigationAction={
            <Link startIcon={<ArrowLeft />} to="/settings/users?pageSize=10&page=1&sort=firstname">
              {formatMessage({
                id: 'global.back',
                defaultMessage: 'Back',
              })}
            </Link>
          }
        />
        <ContentLayout>
          <LoadingIndicatorPage />
        </ContentLayout>
      </Main>
    );
  }

  return (
    <Main>
      <SettingsPageTitle name="Users" />
      <Formik
        onSubmit={handleSubmit}
        initialValues={initialData}
        validateOnChange={false}
        validationSchema={editValidation}
      >
        {({ errors, values, handleChange, isSubmitting }) => {
          return (
            <Form>
              <HeaderLayout
                primaryAction={
                  <Button
                    disabled={isSubmitting || !canUpdate}
                    startIcon={<Check />}
                    loading={isSubmitting}
                    type="submit"
                    size="L"
                  >
                    {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                  </Button>
                }
                title={title}
                navigationAction={
                  <Link
                    startIcon={<ArrowLeft />}
                    to="/settings/users?pageSize=10&page=1&sort=firstname"
                  >
                    {formatMessage({
                      id: 'global.back',
                      defaultMessage: 'Back',
                    })}
                  </Link>
                }
              />
              <ContentLayout>
                {data?.registrationToken && (
                  <Box paddingBottom={6}>
                    <MagicLink registrationToken={data.registrationToken} />
                  </Box>
                )}
                <Stack spacing={7}>
                  <Box
                    background="neutral0"
                    hasRadius
                    shadow="filterShadow"
                    paddingTop={6}
                    paddingBottom={6}
                    paddingLeft={7}
                    paddingRight={7}
                  >
                    <Stack spacing={4}>
                      <Typography variant="delta" as="h2">
                        {formatMessage({
                          id: 'app.components.Users.ModalCreateBody.block-title.details',
                          defaultMessage: 'Details',
                        })}
                      </Typography>
                      <Grid gap={5}>
                        {layout.map(row => {
                          return row.map(input => {
                            return (
                              <GridItem key={input.name} {...input.size}>
                                <GenericInput
                                  {...input}
                                  disabled={!canUpdate}
                                  error={errors[input.name]}
                                  onChange={handleChange}
                                  value={values[input.name] || ''}
                                />
                              </GridItem>
                            );
                          });
                        })}
                      </Grid>
                    </Stack>
                  </Box>
                  <Box
                    background="neutral0"
                    hasRadius
                    shadow="filterShadow"
                    paddingTop={6}
                    paddingBottom={6}
                    paddingLeft={7}
                    paddingRight={7}
                  >
                    <Stack spacing={4}>
                      <Typography variant="delta" as="h2">
                        {formatMessage({
                          id: 'global.roles',
                          defaultMessage: "User's role",
                        })}
                      </Typography>
                      <Grid gap={5}>
                        <GridItem col={6} xs={12}>
                          <SelectRoles
                            disabled={!canUpdate}
                            error={errors.roles}
                            onChange={handleChange}
                            value={values.roles}
                          />
                        </GridItem>
                      </Grid>
                    </Stack>
                  </Box>
                </Stack>
              </ContentLayout>
            </Form>
          );
        }}
      </Formik>
    </Main>
  );
};

EditPage.propTypes = {
  canUpdate: PropTypes.bool.isRequired,
};

export default EditPage;
