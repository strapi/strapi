import React, { useMemo } from 'react';
import { BackHeader, BaselineAlignment, auth, Select, Option, Row } from 'strapi-helper-plugin';
import { Padded, Text } from '@buffetjs/core';
import { Col } from 'reactstrap';
import { useHistory } from 'react-router-dom';
import { get } from 'lodash';
import { useIntl } from 'react-intl';
import ContainerFluid from '../../components/ContainerFluid';
import PageTitle from '../../components/PageTitle';
import SizedInput from '../../components/SizedInput';
import { Header } from '../../components/Settings';
import { useSettingsForm } from '../../hooks';
import { form, schema } from './utils';
import useChangeLanguage from '../LanguageProvider/hooks/useChangeLanguage';
import { languages, languageNativeNames } from '../../i18n';
import { Title, ProfilePageLabel } from './components';
import Bloc from '../../components/Bloc';

const ProfilePage = () => {
  const { goBack } = useHistory();
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
    <form onSubmit={handleSubmit}>
      <PageTitle title="User profile" />
      <BackHeader onClick={goBack} />

      <BaselineAlignment top size="2px" />

      <ContainerFluid padding="18px 30px 0 30px">
        <Header
          isLoading={showHeaderLoader}
          initialData={initialData}
          label={headerLabel}
          modifiedData={modifiedData}
          onCancel={handleCancel}
          showHeaderButtonLoader={showHeaderButtonLoader}
        />
      </ContainerFluid>

      <BaselineAlignment top size="5px" />

      {/* Experience block */}
      <Padded size="md" left right bottom>
        <Bloc isLoading={isLoading}>
          <Padded size="sm" top left right bottom>
            <Col>
              <Padded size="sm" top bottom>
                <Title>
                  {formatMessage({ id: 'Settings.profile.form.section.profile.title' })}
                </Title>
              </Padded>
            </Col>

            <BaselineAlignment top size="9px" />

            <Row>
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
            </Row>
          </Padded>
        </Bloc>
      </Padded>

      <BaselineAlignment top size="13px" />

      {/* Password block */}
      <Padded size="md" left right bottom>
        <Bloc>
          <Padded size="sm" top left right bottom>
            <Col>
              <Padded size="sm" top bottom>
                <Title>
                  {formatMessage({ id: 'Settings.profile.form.section.password.title' })}
                </Title>
              </Padded>
            </Col>

            <BaselineAlignment top size="9px" />

            <Row>
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
            </Row>
          </Padded>
        </Bloc>
      </Padded>

      <BaselineAlignment top size="13px" />

      {/* Interface block */}
      <Padded size="md" left right bottom>
        <Bloc>
          <Padded size="sm" top left right bottom>
            <Col>
              <Padded size="sm" top bottom>
                <Title>
                  {formatMessage({ id: 'Settings.profile.form.section.experience.title' })}
                </Title>
              </Padded>
            </Col>

            <BaselineAlignment top size="7px" />

            <div className="col-6">
              <ProfilePageLabel htmlFor="">
                {formatMessage({
                  id: 'Settings.profile.form.section.experience.interfaceLanguage',
                })}
              </ProfilePageLabel>

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
            </div>
          </Padded>
        </Bloc>
      </Padded>
    </form>
  );
};

export default ProfilePage;
