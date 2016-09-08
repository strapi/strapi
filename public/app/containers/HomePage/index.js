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
import LeftMenu from 'components/LeftMenu';
import RightContentTitle from 'components/RightContentTitle';
import styles from './styles.css';

export default class HomePage extends React.Component { // eslint-disable-line react/prefer-stateless-function

  render() {
    return (
      <div>
        <div className="container">
          <PluginHeader></PluginHeader>
          <div className={`row row-eq-height ${styles.homePageContent}`}>
            <div className={`col-lg-3 p-l-0 p-r-0 ${styles.homePageLeftContent}`}>
              <LeftMenu></LeftMenu>
            </div>
            <div className={`col-lg-9 ${styles.homePageRightContent}`}>
              <RightContentTitle></RightContentTitle>
              <h3 className={styles.homePageRightContentTitle}>Application</h3>
              <p className={styles.homePageRightContentSubTitle}>The general settings of your Strapi application.</p>
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
            </div>
          </div>
        </div>
      </div>
    );
  }
}
