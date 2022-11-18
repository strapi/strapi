import React, { useEffect } from 'react';
import {
  CheckPagePermissions,
  SettingsPageTitle,
  useRBAC,
  LoadingIndicatorPage,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';
import Check from '@strapi/icons/Check';
import {
  ContentLayout,
  HeaderLayout,
  Layout,
  Button,
  Main,
  Stack,
  Typography,
  ToggleInput,
  Select,
  Option,
  Grid,
  GridItem,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import isEqual from 'lodash/isEqual';
import { getRequestUrl } from '../../../../../admin/src/utils';
import { useRolesList, useSettingsForm } from '../../../../../admin/src/hooks';
import adminPermissions from '../../../../../admin/src/permissions';
import schema from './utils/schema';

const ssoPermissions = {
  ...adminPermissions.settings.sso,
  readRoles: adminPermissions.settings.roles.read,
};

export const SingleSignOn = () => {
  const { formatMessage } = useIntl();

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate, canReadRoles },
  } = useRBAC(ssoPermissions);

  const [
    { formErrors, initialData, isLoading, modifiedData, showHeaderButtonLoader },
    // eslint-disable-next-line no-unused-vars
    dispatch,
    { handleChange, handleSubmit },
  ] = useSettingsForm(getRequestUrl('providers/options'), schema, () => {}, [
    'autoRegister',
    'defaultRole',
  ]);
  const { roles } = useRolesList(canReadRoles);

  useFocusWhenNavigate();

  const showLoader = isLoadingForPermissions || isLoading;

  useEffect(() => {
    if (formErrors.defaultRole) {
      const selector = `[name="defaultRole"]`;

      document.querySelector(selector).focus();
    }
  }, [formErrors]);

  const isHeaderButtonDisabled = isEqual(initialData, modifiedData);

  return (
    <Layout>
      <SettingsPageTitle name="SSO" />
      <Main tabIndex={-1}>
        <form
          onSubmit={(e) => {
            if (isHeaderButtonDisabled) {
              e.preventDefault();

              return;
            }
            handleSubmit(e);
          }}
        >
          <HeaderLayout
            primaryAction={
              <Button
                data-testid="save-button"
                disabled={isHeaderButtonDisabled}
                loading={showHeaderButtonLoader}
                startIcon={<Check />}
                type="submit"
                size="L"
              >
                {formatMessage({
                  id: 'global.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            }
            title={formatMessage({ id: 'Settings.sso.title', defaultMessage: 'Single Sign-On' })}
            subtitle={formatMessage({
              id: 'Settings.sso.description',
              defaultMessage: 'Configure the settings for the Single Sign-On feature.',
            })}
          />
          <ContentLayout>
            {showLoader ? (
              <LoadingIndicatorPage />
            ) : (
              <Stack spacing={4} background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                <Typography variant="delta" as="h2">
                  {formatMessage({
                    id: 'global.settings',
                    defaultMessage: 'Settings',
                  })}
                </Typography>
                <Grid gap={4}>
                  <GridItem col={6} m={6} s={12}>
                    <ToggleInput
                      aria-label="autoRegister"
                      data-testid="autoRegister"
                      disabled={!canUpdate}
                      checked={modifiedData.autoRegister}
                      hint={formatMessage({
                        id: 'Settings.sso.form.registration.description',
                        defaultMessage: 'Create new user on SSO login if no account exists',
                      })}
                      label={formatMessage({
                        id: 'Settings.sso.form.registration.label',
                        defaultMessage: 'Auto-registration',
                      })}
                      name="autoRegister"
                      offLabel={formatMessage({
                        id: 'app.components.ToggleCheckbox.off-label',
                        defaultMessage: 'Off',
                      })}
                      onLabel={formatMessage({
                        id: 'app.components.ToggleCheckbox.on-label',
                        defaultMessage: 'On',
                      })}
                      onChange={(e) => {
                        handleChange({
                          target: { name: 'autoRegister', value: e.target.checked },
                        });
                      }}
                    />
                  </GridItem>
                  <GridItem col={6} m={6} s={12}>
                    <Select
                      disabled={!canUpdate}
                      hint={formatMessage({
                        id: 'Settings.sso.form.defaultRole.description',
                        defaultMessage:
                          'It will attach the new authenticated user to the selected role',
                      })}
                      error={
                        formErrors.defaultRole
                          ? formatMessage({
                              id: formErrors.defaultRole.id,
                              defaultMessage: formErrors.defaultRole.id,
                            })
                          : ''
                      }
                      label={formatMessage({
                        id: 'Settings.sso.form.defaultRole.label',
                        defaultMessage: 'Default role',
                      })}
                      name="defaultRole"
                      onChange={(value) => {
                        handleChange({ target: { name: 'defaultRole', value } });
                      }}
                      placeholder={formatMessage({
                        id: 'components.InputSelect.option.placeholder',
                        defaultMessage: 'Choose here',
                      })}
                      value={modifiedData.defaultRole}
                    >
                      {roles.map(({ id, name }) => (
                        <Option key={id} value={id.toString()}>
                          {name}
                        </Option>
                      ))}
                    </Select>
                  </GridItem>
                </Grid>
              </Stack>
            )}
          </ContentLayout>
        </form>
      </Main>
    </Layout>
  );
};

const ProtectedSSO = () => (
  <CheckPagePermissions permissions={ssoPermissions.main}>
    <SingleSignOn />
  </CheckPagePermissions>
);

export default ProtectedSSO;
