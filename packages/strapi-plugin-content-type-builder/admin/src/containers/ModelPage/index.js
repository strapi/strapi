/*
 *
 * ModelPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators } from 'redux';

// Global selectors
import { makeSelectMenu } from 'containers/App/selectors';

import PluginLeftMenu from 'components/PluginLeftMenu';

import { modelFetch } from './actions';

import selectModelPage from './selectors';
import styles from './styles.scss';

export class ModelPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    this.props.modelFetch(this.props.params.modelName);
  }

  render() {
    return (
      <div className={styles.modelPage}>
        <div className="container-fluid">
          <div className="row">
            <PluginLeftMenu
              sections={this.props.menu}
            />
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  modelPage: selectModelPage(),
  menu: makeSelectMenu(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      modelFetch,
    },
    dispatch,
  );
}

ModelPage.propTypes = {
  menu: React.PropTypes.array,
  modelFetch: React.PropTypes.func,
  params: React.PropTypes.object,
};

export default connect(mapStateToProps, mapDispatchToProps)(ModelPage);
