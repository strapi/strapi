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
import { bindActionCreators, compose } from 'redux';

import Input from 'components/InputsIndex';
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

// Selectors
import selectHomePage from './selectors';

// Styles
import styles from './styles.scss';

import reducer from './reducer';
import saga from './saga';

export class HomePage extends React.Component {
  state = { value: [{ url: 'https://sofiaglobe.com/wp-content/uploads/2017/08/Toto-1979.jpg', name: 'https://sofiaglobe.com/wp-content/uploads/2017/08/Toto-1979.jpg' }] };

  onChange = ({ target }) => {
    this.setState({ value: target.value });
  }

  render() {
    return (
      <div className={styles.homePage} style={{ paddingTop: '98px', marginLeft: '100px'}}>
        <form>
          <Input
            name="test"
            value={this.state.value}
            onChange={this.onChange}
            type="file"
          />
        </form>
      </div>
    );
  }
}

HomePage.contextTypes = {
  router: PropTypes.object,
};

HomePage.propTypes = {
  // homePage: PropTypes.object,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      // Your actions here
    },
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({
  homePage: selectHomePage(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'homePage', reducer });
const withSaga = injectSaga({ key: 'homePage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(injectIntl(HomePage));
