/*
 *
 * ServerPage
 *
 */

import React from 'react';
import Helmet from 'react-helmet';
import PluginHeader from 'components/PluginHeader';
import Container from 'components/Container';
import RightContentTitle from 'components/RightContentTitle';
import RightContentSectionTitle from 'components/RightContentSectionTitle';
import styles from './styles.css';

export default class ServerPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.serverPage}>
        <Helmet
          title="Settings Manager - Server"
          meta={[
            { name: 'description', content: 'Configure your Server settings.' },
          ]}
        />
        <div className="container">
          <PluginHeader></PluginHeader>
          <Container>
            <RightContentTitle title="Server" description="Configure your server settings."></RightContentTitle>
            <RightContentSectionTitle title="Coming soon" description=""></RightContentSectionTitle>
          </Container>
        </div>
      </div>
    );
  }
}
