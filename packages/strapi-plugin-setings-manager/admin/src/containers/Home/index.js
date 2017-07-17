/*
 *
 * Home
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createStructuredSelector } from 'reselect';
import Helmet from 'react-helmet';
import { router } from 'app';
import { makeSelectSections } from 'containers/App/selectors';
import selectHome from './selectors';
import { configFetch } from './actions'
import styles from './styles.scss';

export class Home extends React.Component { // eslint-disable-line react/prefer-stateless-function

  componentDidMount() {
    if (this.props.params.slug) {
      const apiUrl = this.props.params.env ? `${this.props.params.slug}/${this.props.params.env}` : this.props.params.slug;
      this.props.configFetch(apiUrl);
    } else {
      router.push(`/plugins/settings-manager/${this.props.sections[0].items[0].slug}`);
    }
  }


  componentWillReceiveProps(nextProps) {
    // check if params slug updated
    if (this.props.params.slug !== nextProps.params.slug) {
      if (nextProps.params.slug) {
        // get data from api if params slug updated
        const apiUrl = nextProps.params.env ? `${nextProps.params.slug}/${nextProps.params.env}` : nextProps.params.slug;
        this.props.configFetch(apiUrl);
      } else {
        // redirect user if no params slug provided
        router.push(`/plugins/settings-manager/${this.props.sections[0].items[0].slug}`);
      }
    } else if (this.props.params.env !== nextProps.params.env && nextProps.params.env) {
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

const mapStateToProps = createStructuredSelector({
  home: selectHome(),
  sections: makeSelectSections(),
})

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
  sections: React.PropTypes.array,
};

export default connect(mapStateToProps, mapDispatchToProps)(Home);
