/*
 *
 * ComingSoonPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';

import { PluginHeader } from 'strapi-helper-plugin';

import styles from './styles.scss';

export class ComingSoonPage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div>
        <Helmet title="Coming soon" />
        <div>
          <div className={`container-fluid ${styles.containerFluid}`}>
            <PluginHeader
              title={{
                id: 'app.components.ComingSoonPage.comingSoon',
              }}
              description={{
                id: 'app.components.ComingSoonPage.featuresNotAvailable',
              }}
              actions={[]}
            />
          </div>
        </div>
      </div>
    );
  }
}

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapDispatchToProps)(ComingSoonPage);
