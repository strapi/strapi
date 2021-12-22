import React, { useMemo } from 'react';
import { BaselineAlignment, auth, Select, Option } from 'strapi-helper-plugin';
import { Padded, Text } from '@buffetjs/core';
import { Col } from 'reactstrap';
import { get } from 'lodash';
import { useIntl } from 'react-intl';
import { languages, languageNativeNames } from '../../i18n';
import ContainerFluid from '../../components/ContainerFluid';
import PageTitle from '../../components/PageTitle';
import SizedInput from '../../components/SizedInput';
import { Header } from '../../components/Settings';
import FormBloc from '../../components/FormBloc';
import { useSettingsForm } from '../../hooks';
import useChangeLanguage from '../LanguageProvider/hooks/useChangeLanguage';
import ProfilePageLabel from './components';
import { form, schema } from './utils';

const ProfilePage = () => {
  const changeLanguage = useChangeLanguage();
  const { formatMessage } = useIntl();

  const onSubmitSuccessCb = data => {
    changeLanguage(data.preferedLanguage);
    auth.setUserInfo(data);
  };

  const [
    { formErrors, initialData, isLoading, modifiedData, showHeaderLoader, showHeaderButtonLoader },
    // eslint-disable-next-line no-unused-vars
    _,
    { handleCancel, handleChange, handleSubmit, setField },
  ] = useSettingsForm('/admin/users/me', schema, onSubmitSuccessCb, [
    'email',
    'firstname',
    'lastname',
    'username',
    'preferedLanguage',
  ]);

  const headerLabel = useMemo(() => {
    const userInfos = auth.getUserInfo();

    if (modifiedData) {
      return modifiedData.username || `${modifiedData.firstname} ${modifiedData.lastname}`;
    }

    return userInfos.username || `${userInfos.firstname} ${userInfos.lastname}`;
  }, [modifiedData]);

  return (
    <>
      <PageTitle title="User profile" />
      <form onSubmit={handleSubmit}>
        <ContainerFluid padding="18px 30px 0 30px">
          <Header
            isLoading={showHeaderLoader}
            initialData={initialData}
            label={headerLabel}
            modifiedData={modifiedData}
            onCancel={handleCancel}
            showHeaderButtonLoader={showHeaderButtonLoader}
          />
          <BaselineAlignment top size="3px" />
          {/* Experience block */}
          <FormBloc
            isLoading={isLoading}
            title={formatMessage({ id: 'Settings.profile.form.section.profile.title' })}
          >
            {Object.keys(form).map(key => (
              <SizedInput
                {...form[key]}
                key={key}
                error={formErrors[key]}
                name={key}
                onChange={handleChange}
                value={get(modifiedData, key, '')}
              />
            ))}
          </FormBloc>
          <BaselineAlignment top size="2px" />

          {/* Password block */}
          {!isLoading && (
            <>
              <Padded top size="md">
                <FormBloc
                  title={formatMessage({ id: 'Settings.profile.form.section.password.title' })}
                >
                  <SizedInput
                    label="Auth.form.currentPassword.label"
                    type="password"
                    validations={{}}
                    error={formErrors.currentPassword}
                    name="currentPassword"
                    onChange={handleChange}
                    value={get(modifiedData, 'currentPassword', '')}
                  />
                  <Col size={6} />
                  <SizedInput
                    label="Auth.form.password.label"
                    type="password"
                    autoComplete="new-password"
                    validations={{}}
                    error={formErrors.password}
                    name="password"
                    onChange={handleChange}
                    value={get(modifiedData, 'password', '')}
                  />

                  <SizedInput
                    label="Auth.form.confirmPassword.label"
                    type="password"
                    validations={{}}
                    error={formErrors.confirmPassword}
                    name="confirmPassword"
                    onChange={handleChange}
                    value={get(modifiedData, 'confirmPassword', '')}
                  />
                </FormBloc>
              </Padded>

              <BaselineAlignment top size="13px" />

              {/* Interface block */}
              <Padded top size="smd">
                <FormBloc
                  title={formatMessage({ id: 'Settings.profile.form.section.experience.title' })}
                >
                  <ProfilePageLabel htmlFor="">
                    {formatMessage({
                      id: 'Settings.profile.form.section.experience.interfaceLanguage',
                    })}
                  </ProfilePageLabel>
                  <Col xs="6">
                    <Select
                      aria-labelledby="interface-language"
                      selectedValue={get(modifiedData, 'preferedLanguage')}
                      onChange={nextLocaleCode => setField('preferedLanguage', nextLocaleCode)}
                    >
                      {languages.map(language => {
                        const langName = languageNativeNames[language];

                        return (
                          <Option value={language} key={language}>
                            {langName}
                          </Option>
                        );
                      })}
                    </Select>

                    <Padded size="sm" top bottom>
                      <Text color="grey">
                        {formatMessage({
                          id: 'Settings.profile.form.section.experience.interfaceLanguage.hint',
                        })}
                      </Text>
                    </Padded>
                  </Col>
                </FormBloc>
              </Padded>
            </>
          )}
        </ContainerFluid>
      </form>
      <BaselineAlignment bottom size="80px" />
    </>
  );
};

export default ProfilePage;
