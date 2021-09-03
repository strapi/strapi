import React from 'react';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
// import get from 'lodash/get';
// import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import {
  CustomContentLayout,
  Form,
  GenericInput,
  SettingsPageTitle,
  // auth,
  useFocusWhenNavigate,
  useNotification,
} from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import { Formik } from 'formik';
import { Box } from '@strapi/parts/Box';
import { Button } from '@strapi/parts/Button';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { HeaderLayout } from '@strapi/parts/Layout';
import { H3 } from '@strapi/parts/Text';
import { Main } from '@strapi/parts/Main';
// import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { CheckIcon } from '@strapi/icons';
import MagicLink from 'ee_else_ce/pages/Users/components/MagicLink';
import fetchUser from './utils/api';
import layout from './utils/layout';

// import { Col } from 'reactstrap';
// import { Padded } from '@buffetjs/core';
// import ContainerFluid from '../../../components/ContainerFluid';
// import FormBloc from '../../../components/FormBloc';
// import { Header } from '../../../components/Settings';
// import { MagicLink, SelectRoles } from '../../../components/Users';
// import { useSettingsForm } from '../../../hooks';
import { editValidation } from '../utils/validations/users';

const fieldsToPick = ['email', 'firstname', 'lastname', 'username', 'isActive', 'roles'];

const EditPage = ({ canUpdate }) => {
  const { formatMessage } = useIntl();
  const {
    params: { id },
  } = useRouteMatch('/settings/users/:id');
  const { push } = useHistory();

  const toggleNotification = useNotification();
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

  // const cbSuccess = data => {
  //   const userInfos = auth.getUserInfo();

  //   // The user is updating themself
  //   if (data.id === userInfos.id) {
  //     auth.setUserInfo(data);
  //   }
  // };
  // const [
  //   { formErrors, initialData, isLoading, modifiedData, showHeaderButtonLoader, showHeaderLoader },
  //   // eslint-disable-next-line no-unused-vars
  //   dispatch,
  //   { handleCancel, handleChange, handleSubmit },
  // ] = useSettingsForm(`/admin/users/${id}`, editValidation, cbSuccess, [
  // 'email',
  // 'firstname',
  // 'lastname',
  // 'username',
  // 'isActive',
  // 'roles',
  // 'registrationToken',
  // ]);
  // const headerLabelId = isLoading
  //   ? 'app.containers.Users.EditPage.header.label-loading'
  //   : 'app.containers.Users.EditPage.header.label';
  // const headerLabelName = initialData.username
  //   ? initialData.username
  //   : `${initialData.firstname} ${initialData.lastname}`;
  // const headerLabel = formatMessage({ id: headerLabelId }, { name: headerLabelName });

  // const hasRegistrationToken = modifiedData.registrationToken;
  // const hasRolesError = formErrors.roles && isEmpty(modifiedData.roles);

  const isLoading = status !== 'success';
  const headerLabel = isLoading
    ? { id: 'app.containers.Users.EditPage.header.label-loading', defaultMessage: 'Edit user' }
    : { id: 'app.containers.Users.EditPage.header.label', defaultMessage: 'Edit {name}' };

  const initialData = pick(data, fieldsToPick);
  const headerLabelName =
    initialData.username || `${initialData.firstname} ${initialData.lastname}`;

  const title = formatMessage(headerLabel, { name: headerLabelName });

  if (isLoading) {
    return (
      <Main labelledBy="title">
        <SettingsPageTitle name="Users" />
        <HeaderLayout
          id="title"
          primaryAction={
            <Button disabled startIcon={<CheckIcon />} type="button">
              {formatMessage({ id: 'form.button.save', defaultMessage: 'Save' })}
            </Button>
          }
          title={title}
        />
        <CustomContentLayout isLoading />
      </Main>
    );
  }

  return (
    <Main labelledBy="title">
      <SettingsPageTitle name="Users" />
      <Formik
        initialValues={initialData}
        validateOnChange={false}
        validationSchema={editValidation}
      >
        {({ errors, values, handleChange }) => {
          const isDisabled = isEqual(initialData, values);

          return (
            <Form>
              <HeaderLayout
                id="title"
                primaryAction={
                  <Button disabled={isDisabled} startIcon={<CheckIcon />} type="submit">
                    {formatMessage({ id: 'form.button.save', defaultMessage: 'Save' })}
                  </Button>
                }
                title={title}
              />
              <CustomContentLayout isLoading={isLoading}>
                {data?.registrationToken && (
                  <Box paddingBottom={6}>
                    <MagicLink registrationToken={data.registrationToken} />
                  </Box>
                )}
                <Stack size={7}>
                  <Box
                    background="neutral0"
                    hasRadius
                    paddingTop={6}
                    paddingBottom={6}
                    paddingLeft={7}
                    paddingRight={7}
                  >
                    <Stack size={4}>
                      <H3 as="h2">
                        {formatMessage({
                          id: 'app.components.Users.ModalCreateBody.block-title.details',
                          defaultMessage: 'Details',
                        })}
                      </H3>
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
                    paddingTop={6}
                    paddingBottom={6}
                    paddingLeft={7}
                    paddingRight={7}
                  >
                    <H3 as="h2">
                      {formatMessage({
                        id: 'app.components.Users.ModalCreateBody.block-title.login',
                        defaultMessage: 'Login settings',
                      })}
                    </H3>
                  </Box>
                </Stack>
              </CustomContentLayout>
            </Form>
          );
        }}
      </Formik>
    </Main>
  );

  // return (
  //   <>
  //     <SettingsPageTitle name="Users" />
  //     <form onSubmit={handleSubmit}>
  //       <ContainerFluid padding="0">
  //         <Header
  //           isLoading={showHeaderLoader}
  //           initialData={initialData}
  //           label={headerLabel}
  //           modifiedData={modifiedData}
  //           onCancel={handleCancel}
  //           showHeaderButtonLoader={showHeaderButtonLoader}
  //         />
  //         {hasRegistrationToken ? (
  //           <>
  //             <Padded top bottom size="sm">
  //               <MagicLink registrationToken={initialData.registrationToken} />
  //             </Padded>
  //             <BaselineAlignment top size="1px" />
  //           </>
  //         ) : (
  //           <BaselineAlignment top size="3px" />
  //         )}

  //         <FormBloc
  //           isLoading={isLoading}
  //           title={formatMessage({
  //             id: 'app.components.Users.ModalCreateBody.block-title.details',
  //           })}
  //         >
  //           {Object.keys(form).map(key => {
  //             return (
  //               <SizedInput
  //                 {...form[key]}
  //                 key={key}
  //                 disabled={!canUpdate}
  //                 error={formErrors[key]}
  //                 name={key}
  //                 onChange={handleChange}
  //                 value={get(modifiedData, key, '')}
  //               />
  //             );
  //           })}
  //         </FormBloc>

  //         <BaselineAlignment top size="2px" />

  //         <Padded top size="md">
  //           {!isLoading && (
  //             <FormBloc
  //               title={formatMessage({ id: 'app.containers.Users.EditPage.roles-bloc-title' })}
  //             >
  //               <Col xs="6">
  //                 <Padded top size="sm">
  //                   <SelectRoles
  //                     name="roles"
  //                     isDisabled={!canUpdate}
  //                     onChange={handleChange}
  //                     error={formErrors.roles}
  //                     value={get(modifiedData, 'roles', [])}
  //                   />
  //                   <BaselineAlignment top size={hasRolesError ? '0' : '17px'} />
  //                 </Padded>
  //               </Col>
  //             </FormBloc>
  //           )}
  //         </Padded>
  //       </ContainerFluid>
  //       <Padded bottom size="md" />
  //     </form>
  //     <BaselineAlignment bottom size="80px" />
  //   </>
  // );
};

EditPage.propTypes = {
  canUpdate: PropTypes.bool.isRequired,
};

export default EditPage;
