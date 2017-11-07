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
import cn from 'classnames';

// Design
import HeaderNav from 'components/HeaderNav';
import List from 'components/List';
import PluginHeader from 'components/PluginHeader';

// Utils
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

// Selectors
import selectHomePage from './selectors';

// Styles
import styles from './styles.scss';

// Actions
import {
  deleteData,
  fetchData,
} from './actions';

import reducer from './reducer';
import saga from './saga';

export class HomePage extends React.Component {
  componentDidMount() {
    this.props.fetchData(this.props.match.params.settingType);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.match.params.settingType !== this.props.match.params.settingType) {
      this.props.fetchData(this.props.match.params.settingType);
    }
  }

  onButtonClick = () => this.props.history.push(`${this.props.location.pathname}/create`);

  render() {
    const noButtonList = this.props.match.params.settingType === 'email-templates';
    const component = this.props.match.params.settingType === 'advanced-settings' ?
      <div>coucou</div> :
        <List
          data={this.props.data}
          deleteActionSucceeded={this.props.deleteActionSucceeded}
          deleteData={this.props.deleteData}
          noButton={noButtonList}
          onButtonClick={this.onButtonClick}
          settingType={this.props.match.params.settingType}
        />;
    return (
      <div>
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            title={{ id: 'users-permissions.HomePage.header.title' }}
            description={{ id: 'users-permissions.HomePage.header.description' }}
            actions={[]}
          />
          <HeaderNav />
          {component}
        </div>
      </div>
    );
  }
}

HomePage.defaultProps = {};

HomePage.propTypes = {
  data: PropTypes.array.isRequired,
  deleteActionSucceeded: PropTypes.bool.isRequired,
  deleteData: PropTypes.func.isRequired,
  fetchData: PropTypes.func.isRequired,
};


function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      deleteData,
      fetchData,
    },
    dispatch,
  );
}

const mapStateToProps = selectHomePage();

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'homePage', reducer });
const withSaga = injectSaga({ key: 'homePage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(injectIntl(HomePage));
