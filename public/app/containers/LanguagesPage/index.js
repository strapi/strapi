/*
 * LanguagesPage
 */

import React from 'react';
import Helmet from 'react-helmet';
import PluginHeader from 'components/PluginHeader';
import Container from 'components/Container';
import RightContentTitle from 'components/RightContentTitle';
import RightContentSectionTitle from 'components/RightContentSectionTitle';

import styles from './styles.css';

export default class LanguagesPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.languagesPage}>
        <Helmet
          title="Settings Manager - Languages"
          meta={[
            { name: 'description', content: 'Configure your Languages settings.' },
          ]}
        />
        <div className="container">
          <PluginHeader></PluginHeader>
          <Container>
            <RightContentTitle title="Languages" description="Configure your languages settings."></RightContentTitle>
            <RightContentSectionTitle title="Coming soon" description=""></RightContentSectionTitle>
          </Container>
        </div>
      </div>
    );
  }
}
