/*
 *
 * DatabasesPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import styles from './styles.css';

export class DatabasesPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.databasesPage}>
        <Helmet
          title="DatabasesPage"
          meta={[
            { name: 'description', content: 'Description of DatabasesPage' },
          ]}
        />
        <FormattedMessage {...messages.header} />
        <h3>Databases</h3>
      </div>
    );
  }
}


function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapDispatchToProps)(DatabasesPage);
