/*
 * DatabasesPage
 *
 * This is the first thing users see of our App, at the '/' route
 *
 * NOTE: while this component should technically be a stateless functional
 * component (SFC), hot reloading does not currently support SFCs. If hot
 * reloading is not a neccessity for you then you can refactor it and remove
 * the linting exception.
 */

import React from 'react';
import Helmet from 'react-helmet';
import PluginHeader from 'components/PluginHeader';
import Container from 'components/Container';
import RightContentTitle from 'components/RightContentTitle';
import RightContentSectionTitle from 'components/RightContentSectionTitle';
import styles from './styles.css';

export default class DatabasesPage extends React.Component { // eslint-disable-line react/prefer-stateless-function

  render() {
    return (
      <div className={styles.databasesPage}>
        <Helmet
          title="Settings Manager - Databases"
          meta={[
            { name: 'description', content: 'Configure your Databases settings.' },
          ]}
        />
        <div className="container">
          <PluginHeader></PluginHeader>
          <Container>
            <RightContentTitle title="Databases" description="Configure your databases settings."></RightContentTitle>
            <RightContentSectionTitle title="Coming soon" description=""></RightContentSectionTitle>
          </Container>
        </div>
      </div>
    );
  }
}
