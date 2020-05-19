import React from 'react';
import { BackHeader, Row } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';
import { Padded } from '@buffetjs/core';
import Bloc from '../../components/Bloc';
import BaselineAlignement from '../../components/BaselineAlignement';
import ContainerFluid from '../../components/ContainerFluid';
import SizedInput from '../../components/SizedInput';
import Header from './Header';
import form from './utils/form';

const ProfilePage = () => {
  const { goBack } = useHistory();

  return (
    <>
      <BackHeader onClick={goBack} />
      <ContainerFluid>
        <Header />
        <BaselineAlignement top size="3px" />
        <Bloc>
          <BaselineAlignement top size="22px" />
          <Padded left right size="sm">
            <Row>
              {Object.keys(form).map(key => {
                return <SizedInput {...form[key]} key={key} name={key} />;
              })}
            </Row>
          </Padded>
        </Bloc>
      </ContainerFluid>
    </>
  );
};

export default ProfilePage;
