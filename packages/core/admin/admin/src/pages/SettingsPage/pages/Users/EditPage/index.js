import React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Main,
  Typography,
} from '@strapi/design-system';
import {
  auth,
  Form,
  GenericInput,
  Link,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useAppInfo,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
} from '@strapi/helper-plugin';
import { ArrowLeft, Check } from '@strapi/icons';
import { Formik } from 'formik';
import get from 'lodash/get';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useHistory, useRouteMatch } from 'react-router-dom';

import { useAdminUsers } from '../../../../../hooks/useAdminUsers';
import { useEnterprise } from '../../../../../hooks/useEnterprise';
import { formatAPIErrors } from '../../../../../utils/formatAPIErrors';
import { getFullName } from '../../../../../utils/getFullName';
import { MagicLinkCE } from '../components/MagicLink';
import SelectRoles from '../components/SelectRoles';
import { editValidation } from '../utils/validations/users';

import { putUser } from './utils/api';
import layout from './utils/layout';

const fieldsToPick = ['email', 'firstname', 'lastname', 'username', 'isActive', 'roles'];

const EditPage = ({ canUpdate }) => {
  const { formatMessage } = useIntl();
  const {
    params: { id },
  } = useRouteMatch('/settings/users/:id');
  const { push } = useHistory();
  const { setUserDisplayName } = useAppInfo();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const MagicLink = useEnterprise(
    MagicLinkCE,
    async () =>
      (
        await import(
          '../../../../../../../ee/admin/pages/SettingsPage/pages/Users/components/MagicLink'
        )
      ).MagicLinkEE
  );

  useFocusWhenNavigate();

  const {
    users: [user],
    isLoading: isLoadingAdminUsers,
  } = useAdminUsers(
    { id },
    {
      cacheTime: 0,

      onError(error) {
        const { status } = error.response;

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
        } else {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error', defaultMessage: 'An error occured' },
          });
        }
      },
    }
  );

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
        message: get(err, 'response.data.error.message', 'notification.error'),
      });
    }

    unlockApp();
  };

  const isLoading = isLoadingAdminUsers || !MagicLink;

  const headerLabel = isLoading
    ? { id: 'app.containers.Users.EditPage.header.label-loading', defaultMessage: 'Edit user' }
    : { id: 'app.containers.Users.EditPage.header.label', defaultMessage: 'Edit {name}' };

  const initialData = Object.keys(pick(user, fieldsToPick)).reduce((acc, current) => {
    if (current === 'roles') {
      acc[current] = (user?.roles || []).map(({ id }) => id);

      return acc;
    }

    acc[current] = user?.[current];

    return acc;
  }, {});

  const headerLabelName =
    initialData.username || getFullName(initialData.firstname, initialData.lastname);

  const title = formatMessage(headerLabel, { name: headerLabelName });

  if (isLoading) {
    return (
      <Main aria-busy="true">
        {/* TODO: translate */}
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
        {({ errors, values, handleChange, isSubmitting, dirty }) => {
          return (
            <Form>
              <HeaderLayout
                primaryAction={
                  <Button
                    disabled={isSubmitting || !canUpdate ? true : !dirty}
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
                {user?.registrationToken && (
                  <Box paddingBottom={6}>
                    <MagicLink registrationToken={user.registrationToken} />
                  </Box>
                )}
                <Flex direction="column" alignItems="stretch" gap={7}>
                  <Box
                    background="neutral0"
                    hasRadius
                    shadow="filterShadow"
                    paddingTop={6}
                    paddingBottom={6}
                    paddingLeft={7}
                    paddingRight={7}
                  >
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      <Typography variant="delta" as="h2">
                        {formatMessage({
                          id: 'app.components.Users.ModalCreateBody.block-title.details',
                          defaultMessage: 'Details',
                        })}
                      </Typography>
                      <Grid gap={5}>
                        {layout.map((row) => {
                          return row.map((input) => {
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
                    </Flex>
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
                    <Flex direction="column" alignItems="stretch" gap={4}>
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
                    </Flex>
                  </Box>
                </Flex>
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
