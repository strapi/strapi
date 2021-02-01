import React from 'react';
import PropTypes from 'prop-types';
import { Header } from '@buffetjs/custom';
import PageTitle from '../PageTitle';
import Wrapper from './Wrapper';
import BaselineAlignment from '../BaselineAlignment';

export const SettingsPageLayout = ({ pageTitle, header, Content }) => {
  return (
    <Wrapper>
      <PageTitle title={pageTitle} header={header} />
      <Header {...header} />
      <BaselineAlignment top size="3px" />
      {Content}
    </Wrapper>
  );
};

SettingsPageLayout.propTypes = {
  pageTitle: PropTypes.string.isRequired,
  header: PropTypes.shape({
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    actions: PropTypes.arrayOf(PropTypes.shape({})),
  }),
  Content: PropTypes.node.isRequired,
};
