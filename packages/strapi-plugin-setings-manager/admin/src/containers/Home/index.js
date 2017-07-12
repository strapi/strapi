/*
 *
 * Home
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import PluginLeftMenu from 'components/PluginLeftMenu';
import InputToggle from 'components/InputToggle';
import selectHome from './selectors';
import styles from './styles.scss';

export class Home extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      value: false,
      value1: null,
    }
  }

  handleChange = ({ target }) => {
    console.log('ok');
    console.log(target);
    this.setState({ value: !this.state.value});
  }

  render() {

    const test = {
          "name": "bame",
          "slug": "name",
          "target": "general.name",
          "type": "text",
          "value": "ExperienceApp",
          "validations" : {
            "maxLength": 12,
            "required": true,
            "regex": /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          }
    };

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

            <div className="col-md-9">
              <div className="form-group">
              </div>
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
