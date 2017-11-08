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
import { isEmpty, replace } from 'lodash';

// Design
import EditForm from 'components/EditForm';
import HeaderNav from 'components/HeaderNav';
import List from 'components/List';
import PluginHeader from 'components/PluginHeader';
import PopUpForm from 'components/PopUpForm';

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

  onButtonClick = () => {
    if (this.props.match.params.settingType === 'roles') {
      this.props.history.push(`${this.props.location.pathname}/create`);
    } else {
      this.props.history.push(`${this.props.location.pathname}#add::${this.props.match.params.settingType}`);
    }
  }

  render() {
    const noButtonList = this.props.match.params.settingType === 'email-templates';
    const component = this.props.match.params.settingType === 'advanced-settings' ?
      <EditForm /> :
        <List
          data={this.props.data}
          deleteActionSucceeded={this.props.deleteActionSucceeded}
          deleteData={this.props.deleteData}
          noButton={noButtonList}
          onButtonClick={this.onButtonClick}
          settingType={this.props.match.params.settingType}
        />;

      const hashArray = replace(this.props.location.hash, '#', '').split('::');

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
        <PopUpForm
          actionType={hashArray[0]}
          settingType={hashArray[1]}
          isOpen={!isEmpty(this.props.location.hash)}
        />
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
