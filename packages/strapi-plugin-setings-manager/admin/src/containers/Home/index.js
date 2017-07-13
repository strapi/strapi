/*
 *
 * Home
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Helmet from 'react-helmet';
import selectHome from './selectors';
import { configFetch } from './actions'
import styles from './styles.scss';

export class Home extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentWillReceiveProps(nextProps) {
    if (this.props.params.slug !== nextProps.params.slug) {
      // this.props.configFetch(nextProps.params.slug);
    }
  }

  render() {
    return (
      <div className={styles.home}>
        <Helmet
          title="Home"
          meta={[
            { name: 'description', content: 'Description of Home' },
          ]}
        />
      </div>
    );
  }
}

const mapStateToProps = selectHome();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      configFetch,
    },
    dispatch
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(Home);
