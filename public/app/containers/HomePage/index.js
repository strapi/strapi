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
import PluginHeader from 'components/PluginHeader';
import RightContentSectionTitle from 'components/RightContentSectionTitle';
import Container from 'components/Container';
import RightContentTitle from 'components/RightContentTitle';
import styles from './styles.css';

export default class HomePage extends React.Component { // eslint-disable-line react/prefer-stateless-function

  render() {
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
