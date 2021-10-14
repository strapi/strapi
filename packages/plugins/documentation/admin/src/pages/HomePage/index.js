/*
 *
 * HomePage
 *
 */

import React, { useEffect, useState } from 'react';
import flatten from 'lodash/flatten';
import {
  PopUpWarning,
  LoadingIndicatorPage,
  CheckPermissions,
  SizedInput,
  getYupInnerErrors,
} from '@strapi/helper-plugin';
import pluginPermissions from '../../permissions';
import getTrad from '../../utils/getTrad';
import Block from '../../components/Block';
import Copy from '../../components/Copy';
import Header from '../../components/Header';
import Row from '../../components/Row';
import { ContainerFluid, StyledRow, VersionWrapper } from './components';
import useHomePage from './useHomePage';
import schema from './utils/schema';

const HomePage = () => {
  const [versionToDelete, setVersionToDelete] = useState(null);

  const [{ formErrors, modifiedData }, setState] = useState({
    formErrors: null,
    modifiedData: {
      restrictedAccess: true,
      password: '',
    },
  });

  const { data, isLoading, deleteMutation, submitMutation, regenerateDocMutation } = useHomePage();

  useEffect(() => {
    if (data?.form) {
      const initialData = flatten(data.form).reduce((acc, current) => {
        acc[current.name] = current.value;

        return acc;
      }, {});
      setState({ formErrors: null, modifiedData: initialData });
    }
  }, [data]);

  const handleChange = ({ target: { name, value } }) => {
    setState(prev => ({
      ...prev,
      modifiedData: {
        ...prev.modifiedData,
        [name]: value,
      },
    }));
  };

  const handleDeleteDoc = version => {
    setVersionToDelete(version);
  };

  const handleConfirmDeleteDoc = () => {
    deleteMutation.mutate({ prefix: data.prefix, version: versionToDelete });
    toggleModal();
  };

  const handleSubmit = async e => {
    e.preventDefault();

    try {
      await schema.validate(modifiedData, { abortEarly: false });

      setState(prev => ({ ...prev, formErrors: null }));

      submitMutation.mutate({ body: modifiedData, prefix: data.prefix });
    } catch (err) {
      const errors = getYupInnerErrors(err);

      setState(prev => ({ ...prev, formErrors: errors }));
    }
  };

  const handleUpdateDoc = version => {
    regenerateDocMutation.mutate({ version, prefix: data.prefix });
  };

  const toggleModal = () => {
    setVersionToDelete(null);
  };

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  // FIXME
  if (!data) {
    return null;
  }

  return (
    <ContainerFluid className="container-fluid">
      <PopUpWarning
        isOpen={versionToDelete !== null}
        toggleModal={toggleModal}
        content={{
          title: 'components.popUpWarning.title',
          message: getTrad('containers.HomePage.PopUpWarning.message'),
          cancel: 'app.components.Button.cancel',
          confirm: getTrad('containers.HomePage.PopUpWarning.confirm'),
        }}
        popUpWarningType="danger"
        onConfirm={handleConfirmDeleteDoc}
      />
      <form onSubmit={handleSubmit}>
        <Header currentDocVersion={data.currentVersion} docPrefixURL={data.prefix} />
        <StyledRow className="row">
          <Block>
            <Copy />
          </Block>
          <CheckPermissions permissions={pluginPermissions.update}>
            <Block>
              <div className="row">
                <SizedInput
                  description={getTrad(
                    'containers.HomePage.form.restrictedAccess.inputDescription'
                  )}
                  label={getTrad('containers.HomePage.form.restrictedAccess')}
                  name="restrictedAccess"
                  onChange={handleChange}
                  size={{ xs: 6 }}
                  type="bool"
                  value={modifiedData.restrictedAccess}
                />
                {modifiedData.restrictedAccess && (
                  <SizedInput
                    description={getTrad('containers.HomePage.form.password.inputDescription')}
                    label={getTrad('containers.HomePage.form.password')}
                    error={formErrors?.password}
                    name="password"
                    onChange={handleChange}
                    size={{ xs: 6 }}
                    type="password"
                    value={modifiedData.password}
                  />
                )}
              </div>
            </Block>
          </CheckPermissions>
          <Block title={getTrad('containers.HomePage.Block.title')}>
            <VersionWrapper>
              <Row isHeader />
              {data.docVersions.map(doc => {
                return (
                  <Row
                    key={doc.generatedDate}
                    data={doc}
                    currentDocVersion={data.currentVersion}
                    onClickDelete={handleDeleteDoc}
                    onUpdateDoc={handleUpdateDoc}
                  />
                );
              })}
            </VersionWrapper>
          </Block>
        </StyledRow>
      </form>
    </ContainerFluid>
  );
};

export default HomePage;
