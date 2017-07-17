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
    // always fetch environments
    this.props.environmentsFetch();

    if (this.props.params.slug) {
      const isEnvironmentsRequired = includes(config.environmentsRequired, this.props.params.slug);

      if (!isEnvironmentsRequired) {
        this.props.configFetch(this.props.params.slug);
      } else if (this.props.params.env){
        this.props.configFetch(`${this.props.params.slug}/${this.props.params.env}`);
      }
    }
  }


  componentWillReceiveProps(nextProps) {

    const isEnvironmentsRequired = nextProps.params.slug ?  includes(config.environmentsRequired, nextProps.params.slug) : false;

    // check if params slug updated
    if (this.props.params.slug !== nextProps.params.slug && nextProps.params.slug) {

      // redirect user if environnemnt is required and params environment not provided
      if (isEnvironmentsRequired && !nextProps.params.env) {
        this.props.history.push(`${nextProps.location.pathname}/${nextProps.environments[0].name}`)
      }

      // get data from api if params slug updated
      const apiUrl = isEnvironmentsRequired ? `${nextProps.params.slug}/${nextProps.environments[0].name}` : nextProps.params.slug;

      this.props.configFetch(apiUrl);
    } else if (this.props.params.env !== nextProps.params.env) {

      // get data if params env updated
      this.props.configFetch(`${this.props.params.slug}/${nextProps.params.env}`);
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
      environmentsFetch,
    },
    dispatch
  )
}

Home.propTypes = {
  configFetch: React.PropTypes.func.isRequired,
  environmentsFetch: React.PropTypes.func.isRequired,
  history: React.PropTypes.object.isRequired,
  params: React.PropTypes.object.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(Home);
