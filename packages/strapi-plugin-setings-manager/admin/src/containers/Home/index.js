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

  componentDidMount() {
    if (this.props.params.slug) {
      const apiUrl = this.props.params.env ? `${this.props.params.slug}/${this.props.params.env}` : this.props.params.slug;
      this.props.configFetch(apiUrl);
    }
  }


  componentWillReceiveProps(nextProps) {
    // check if params slug updated
    if (this.props.params.slug !== nextProps.params.slug && nextProps.params.slug) {

      // get data from api if params slug updated
      const apiUrl = nextProps.params.env ? `${nextProps.params.slug}/${nextProps.params.env}` : nextProps.params.slug;

      this.props.configFetch(apiUrl);
    } else if (this.props.params.env !== nextProps.params.env) {
      console.log('-------');
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
    },
    dispatch
  )
}

Home.propTypes = {
  configFetch: React.PropTypes.func.isRequired,
  params: React.PropTypes.object.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(Home);
