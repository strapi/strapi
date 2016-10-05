/*
 *
 * AdvancedPage
 *
 */

import React from 'react';
import Helmet from 'react-helmet';
import PluginHeader from 'components/PluginHeader';
import Container from 'components/Container';
import RightContentTitle from 'components/RightContentTitle';
import RightContentSectionTitle from 'components/RightContentSectionTitle';
import styles from './styles.scss';

export default class AdvancedPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.advancedPage}>
        <Helmet
          title="Settings Manager - Advanced"
          meta={[
            { name: 'description', content: 'Configure your Advanced settings.' },
          ]}
        />
        <div className="container">
          <PluginHeader></PluginHeader>
          <Container>
            <RightContentTitle title="Advanced" description="Configure your advanced settings."></RightContentTitle>
            <RightContentSectionTitle title="Coming soon" description=""></RightContentSectionTitle>
          </Container>
        </div>
      </div>
    );
  }
}
