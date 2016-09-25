/*
 * HomePage
 *
 * This is the first thing users see of our App, at the '/' route
 *
 * NOTE: while this component should technically be a stateless functional
 * component (SFC), hot reloading does not currently support SFCs. If hot
 * reloading is not a neccessity for you then you can refactor it and remove
 * the linting exception.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';

import PluginHeader from 'components/PluginHeader';
import RightContentSectionTitle from 'components/RightContentSectionTitle';
import Container from 'components/Container';
import RightContentTitle from 'components/RightContentTitle';

import {
  selectGeneralSettings,
  selectLoading,
  selectError,
} from 'containers/HomePage/selectors';

import { changeUsername } from './actions';
import { loadGeneralSettings } from 'containers/HomePage/actions';

import styles from './styles.css';

export class HomePage extends React.Component {

  componentDidMount() {
    this.props.onPageLoad();
  }

  render() {
    console.log('this.props.generalSettings', this.props.generalSettings);
    return (
      <div>
        <div className="container">
          <PluginHeader></PluginHeader>
          <Container>
            <RightContentTitle title="General" description="Configure your general settings."></RightContentTitle>
            <RightContentSectionTitle title="Application" description="The general settings of your Strapi application."></RightContentSectionTitle>
            <div className={`form-group row ${styles.homePageRightContentFormGroup}`}>
              <label htmlFor="applicationName" className="col-xs-7 col-form-label">Name</label>
              <div className="col-xs-5">
                <input className="form-control" type="text" placeholder="My Application" id="applicationName"></input>
              </div>
            </div>
            <div className={`form-group row ${styles.homePageRightContentFormGroup}`}>
              <label htmlFor="applicationDescription" className="col-xs-7 col-form-label">Description</label>
              <div className="col-xs-5">
                <input className="form-control" type="text" placeholder="A Strapi application" id="applicationDescription"></input>
              </div>
            </div>
            <div className={`form-group row ${styles.homePageRightContentFormGroup}`}>
              <label htmlFor="applicationVersion" className="col-xs-7 col-form-label">Version</label>
              <div className="col-xs-5">
                <input className="form-control" type="text" placeholder="0.0.1" id="applicationVersion"></input>
              </div>
            </div>
          </Container>
        </div>
      </div>
    );
  }
}

HomePage.propTypes = {
  // changeRoute: React.PropTypes.func,
  // loading: React.PropTypes.bool,
  // error: React.PropTypes.oneOfType([
  //   React.PropTypes.object,
  //   React.PropTypes.bool,
  // ]),
  // repos: React.PropTypes.oneOfType([
  //   React.PropTypes.array,
  //   React.PropTypes.bool,
  // ]),
  // onSubmitForm: React.PropTypes.func,
  // username: React.PropTypes.string,
  // onChangeUsername: React.PropTypes.func,
};

export function mapDispatchToProps(dispatch) {
  return {
    // onChangeUsername: (evt) => dispatch(changeUsername(evt.target.value)),
    // changeRoute: (url) => dispatch(push(url)),
    onPageLoad: (evt) => {
      // if (evt !== undefined && evt.preventDefault) evt.preventDefault();
      dispatch(loadGeneralSettings());
    },

    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  generalSettings: selectGeneralSettings(),
  // username: selectUsername(),
  // loading: selectLoading(),
  // error: selectError(),
});

// Wrap the component to inject dispatch and state into it
export default connect(mapStateToProps, mapDispatchToProps)(HomePage);
