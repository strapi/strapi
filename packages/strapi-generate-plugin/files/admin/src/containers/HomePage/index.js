/*
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { injectIntl } from 'react-intl';
import { compose } from 'redux';

import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

import Button from 'components/Button';

import styles from './styles.scss';
import { loadData } from './actions';
import { makeSelectLoading, makeSelectData } from './selectors';
import reducer from './reducer';
import saga from './saga';

export class HomePage extends React.Component {
  generateDataBlock() {
    let dataBlock;
    if (this.props.data) {
      const items = this.props.data.map((item, i) => <li key={i}>{item}</li>);
      dataBlock = (
        <div>
          <p>Data:</p>
          <ul>{items}</ul>
        </div>
      );
    }
    return dataBlock;
  }

  render() {
    // Generate the data block
    const dataBlock = this.generateDataBlock();

    return (
      <div className={styles.homePage}>
        <div className="row">
          <div className="col-md-12">
            <p>This is an example of a fake API call.</p>
            <p>Loading: {this.props.loading ? 'yes' : 'no'}.</p>
            {dataBlock}
            <Button
              label={this.props.loading ? 'Loading...' : 'Submit'}
              disabled={this.props.loading}
              onClick={this.props.loadData}
            />
          </div>
        </div>
      </div>
    );
  }
}

HomePage.contextTypes = {
  router: PropTypes.object,
};

HomePage.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.object,
  ]),
  exposedComponents: PropTypes.object,
  loadData: PropTypes.func,
  loading: PropTypes.bool,
};

function mapDispatchToProps(dispatch) {
  return {
    loadData: () => dispatch(loadData()),
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  loading: makeSelectLoading(),
  data: makeSelectData(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'homePage', reducer });
const withSaga = injectSaga({ key: 'homePage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(injectIntl(HomePage));
