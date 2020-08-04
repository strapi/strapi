import React from 'react';
import { useIntl } from 'react-intl';
import { Header } from '@buffetjs/custom';
import { FormBloc, SettingsPageTitle, SizedInput } from 'strapi-helper-plugin';
import { Container } from 'reactstrap';
import styled from 'styled-components';
import getTrad from '../../utils/getTrad';
import ListBaselineAlignment from '../../components/ListBaselineAlignment';
import form from './utils/form';

const ContainerFluid = styled(Container)`
  padding: ${({ padding }) => padding};
`;

const AdvancedSettingsPage = () => {
  const { formatMessage } = useIntl();
  const pageTitle = formatMessage({ id: getTrad('HeaderNav.link.advancedSettings') });
  const handleSubmit = e => {
    e.preventDefault();
  };

  return (
    <>
      <SettingsPageTitle name={pageTitle} />
      <div>
        <form onSubmit={handleSubmit}>
          <Header title={{ label: pageTitle }} />
          <ContainerFluid padding="0">
            <ListBaselineAlignment />
            <FormBloc title="Settings">
              {form.map(input => {
                return <SizedInput key={input.name} {...input} />;
              })}
            </FormBloc>
          </ContainerFluid>
        </form>
      </div>
    </>
  );
};

export default AdvancedSettingsPage;
