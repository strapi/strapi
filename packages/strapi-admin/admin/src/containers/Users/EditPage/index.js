import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { get, isEmpty } from 'lodash';
import { useGlobalContext, auth } from 'strapi-helper-plugin';
import { Col } from 'reactstrap';
import { Padded } from '@buffetjs/core';
import PropTypes from 'prop-types';
import BaselineAlignement from '../../../components/BaselineAlignement';
import PageTitle from '../../../components/SettingsPageTitle';
import ContainerFluid from '../../../components/ContainerFluid';
import FormBloc from '../../../components/FormBloc';
import SizedInput from '../../../components/SizedInput';
import { Header, MagicLink, SelectRoles } from '../../../components/Users';
import { useUsersForm } from '../../../hooks';
import { editValidation } from '../../../validations/users';
import form from './utils/form';

const EditPage = ({ canUpdate }) => {
  const { settingsBaseURL } = useGlobalContext();
  const { formatMessage } = useIntl();
  const {
    params: { id },
  } = useRouteMatch(`${settingsBaseURL}/users/:id`);

  const cbSuccess = data => {
    const userInfos = auth.getUserInfo();

    // The user is updating himself
    if (data.id === userInfos.id) {
      auth.setUserInfo(data);
    }
  };
  const [
    { formErrors, initialData, isLoading, modifiedData, showHeaderButtonLoader, showHeaderLoader },
    // eslint-disable-next-line no-unused-vars
    dispatch,
    { handleCancel, handleChange, handleSubmit },
  ] = useUsersForm(`/admin/users/${id}`, editValidation, cbSuccess, [
    'email',
    'firstname',
    'lastname',
    'username',
    'isActive',
    'roles',
    'registrationToken',
  ]);
  const headerLabelId = isLoading
    ? 'app.containers.Users.EditPage.header.label-loading'
    : 'app.containers.Users.EditPage.header.label';
  const headerLabelName = initialData.username
    ? initialData.username
    : `${initialData.firstname} ${initialData.lastname}`;
  const headerLabel = formatMessage({ id: headerLabelId }, { name: headerLabelName });

  const hasRegistrationToken = modifiedData.registrationToken;
  const hasRolesError = formErrors.roles && isEmpty(modifiedData.roles);

  return (
    <>
      <PageTitle name="Users" />
      <form onSubmit={handleSubmit}>
        <ContainerFluid padding="0">
          <Header
            isLoading={showHeaderLoader}
            initialData={initialData}
            label={headerLabel}
            modifiedData={modifiedData}
            onCancel={handleCancel}
            showHeaderButtonLoader={showHeaderButtonLoader}
          />
          {hasRegistrationToken ? (
            <>
              <Padded top bottom size="sm">
                <MagicLink registrationToken={initialData.registrationToken} />
              </Padded>
              <BaselineAlignement top size="1px" />
            </>
          ) : (
            <BaselineAlignement top size="3px" />
          )}

          <FormBloc
            isLoading={isLoading}
            title={formatMessage({
              id: 'app.components.Users.ModalCreateBody.block-title.details',
            })}
          >
            {Object.keys(form).map(key => {
              return (
                <SizedInput
                  {...form[key]}
                  key={key}
                  disabled={!canUpdate}
                  error={formErrors[key]}
                  name={key}
                  onChange={handleChange}
                  value={get(modifiedData, key, '')}
                />
              );
            })}
          </FormBloc>
          <BaselineAlignement top size="2px" />
          <Padded top size="md">
            {!isLoading && (
              <FormBloc
                title={formatMessage({ id: 'app.containers.Users.EditPage.roles-bloc-title' })}
              >
                <Col xs="6">
                  <Padded top size="sm">
                    <SelectRoles
                      name="roles"
                      isDisabled={!canUpdate}
                      onChange={handleChange}
                      error={formErrors.roles}
                      value={get(modifiedData, 'roles', [])}
                    />
                    <BaselineAlignement top size={hasRolesError ? '0' : '17px'} />
                  </Padded>
                </Col>
              </FormBloc>
            )}
          </Padded>
        </ContainerFluid>
        <Padded bottom size="md" />
      </form>
    </>
  );
};

EditPage.propTypes = {
  canUpdate: PropTypes.bool.isRequired,
};

export default EditPage;
