/*
 *
 * ExamplePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { injectIntl } from 'react-intl';
import { bindActionCreators, compose } from 'redux';
import pluginId from 'pluginId';

import Button from 'components/Button';

import styles from './styles.scss';
import { loadData } from './actions';
import { makeSelectLoading, makeSelectData } from './selectors';
import reducer from './reducer';
import saga from './saga';

export class ExamplePage extends React.Component {
  generateDataBlock() {
    if (this.props.data) {
      const items = this.props.data.map((item, i) => <li key={i}>{item}</li>);
      return (
        <div>
          <p>Data:</p>
          <ul>{items}</ul>
        </div>
      );
    }
    return;
  }

  render() {
    console.log('Don\'t forget to delete the ExampleContainer when you\'re done studying it');
    // Generate the data block
    const dataBlock = this.generateDataBlock();

    return (
      <div className={styles.examplePage}>
        <div className="row">
          <div className="col-md-12">
            <p>This is an example of a fake API call.</p>
            <p>Loading: {this.props.loading ? 'yes' : 'no'}.</p>
            {dataBlock}
            <Button
              label={this.props.loading ? 'Loading...' : 'Submit'}
              disabled={this.props.loading}
              onClick={this.props.loadData}
              primary
            />
          </div>
        </div>
      </div>
    );
  }
}

ExamplePage.contextTypes = {
  router: PropTypes.object,
};

ExamplePage.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.object,
  ]).isRequired,
  loadData: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      loadData,
    },
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({
  loading: makeSelectLoading(),
  data: makeSelectData(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = strapi.injectReducer({ key: 'examplePage', reducer, pluginId });
const withSaga = strapi.injectSaga({ key: 'examplePage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(injectIntl(ExamplePage));
