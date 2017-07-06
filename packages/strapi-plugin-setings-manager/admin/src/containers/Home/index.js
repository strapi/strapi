/*
 *
 * Home
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import PluginLeftMenu from 'components/PluginLeftMenu';
import selectHome from './selectors';
import styles from './styles.scss';

export class Home extends React.Component { // eslint-disable-line react/prefer-stateless-function
  // constructor(props) {
  //   super(props);
  //   // this.leftMenuItems = [
  //   //   {
  //   //     header: 'global settings',
  //   //     items: [
  //   //       general, 'languages', 'advanced'],
  //   //   }
  //   // ]
  // }


  render() {
    
    return (
      <div className={styles.home}>
        <div className={styles.baseline}></div>
        <Helmet
          title="Home"
          meta={[
            { name: 'description', content: 'Description of Home' },
          ]}
        />
        <div className="container-fluid">
          <div className="row">
            <PluginLeftMenu />
            <div className="col-md-9">
              f
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = selectHome();

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Home);
