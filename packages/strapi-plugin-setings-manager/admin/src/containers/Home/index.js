/*
 *
 * Home
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { includes } from 'lodash';
import Helmet from 'react-helmet';
import selectHome from './selectors';
import { configFetch, environmentsFetch } from './actions'
import styles from './styles.scss';
import config from './config.json';

export class Home extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    if (this.props.params.slug) {
      const isEnvironemntsRequired = includes(config.environmentsRequired, this.props.params.slug);
      // TODO handle specific url for environments
      if (!isEnvironemntsRequired) {
        this.props.configFetch(this.props.params.slug);
      } else {
        this.props.environmentsFetch();
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.params.slug !== nextProps.params.slug && nextProps.params.slug) {
      // TODO add condition to check if environments has already been fetched
      const isEnvironemntsRequired = includes(config.environmentsRequired, nextProps.params.slug);

      if (!isEnvironemntsRequired) {
        this.props.configFetch(nextProps.params.slug);
      } else { // TODO change to else if (isEmpty(this.props.environments))
        this.props.environmentsFetch();
      } // else { ... }

    } else if (this.props.params.env !== nextProps.params.env) {
      // TODO handle environments
      this.props.configFetch(`${nextProps.params.slug}/${nextProps.params.env}`);
    }
  }

  render() {
    console.log(config);
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
      environmentsFetch,
    },
    dispatch
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(Home);
