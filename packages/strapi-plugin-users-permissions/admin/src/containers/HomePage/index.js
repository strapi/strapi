/*
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { bindActionCreators, compose } from 'redux';
import cn from 'classnames';
import { clone, includes, isEmpty, replace } from 'lodash';

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
  onChange,
} from './actions';

import reducer from './reducer';
import saga from './saga';

const keyBoardShortCuts = [18, 78];

export class HomePage extends React.Component {
  state = { mapKey: {} };

  componentDidMount() {
    this.props.fetchData(this.props.match.params.settingType);
    document.addEventListener('keydown', this.handleKeyBoardShortCut);
    document.addEventListener('keyup', this.handleKeyBoardShortCut);
  }

  componentWillUpdate(nextProps) {
    const allowedPaths = ['roles', 'providers', 'email-templates', 'advanced-settings'];
    const shouldRedirect = allowedPaths.filter(el => el === nextProps.match.params.settingType).length === 0;

    if (shouldRedirect) {
      this.props.history.push('/404');
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.match.params.settingType !== this.props.match.params.settingType) {
      this.props.fetchData(this.props.match.params.settingType);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyBoardShortCut);
    document.removeEventListener('keyup', this.handleKeyBoardShortCut);
  }

  handleKeyBoardShortCut = (e) => {
    if (includes(keyBoardShortCuts, e.keyCode)) {
      const mapKey = clone(this.state.mapKey);
      mapKey[e.keyCode] = e.type === 'keydown';
      this.setState({ mapKey });

      // Check if user pressed option + n;
      if (mapKey[18] && mapKey[78]) {
        this.setState({ mapKey: {} });
        this.handleButtonClick();
      }
    }

  }

  handleButtonClick = () => {
    if (this.props.match.params.settingType === 'roles') {
      this.props.history.push(`${this.props.location.pathname}/create`);
    } else if (this.props.match.params.settingType === 'providers') {
      this.props.history.push(`${this.props.location.pathname}#add::${this.props.match.params.settingType}`);
    }
  }

  pluginHeaderActions = [
    {
      label: 'users-permissions.EditPage.cancel',
      kind: 'secondary',
      onClick: () => {},
      type: 'button',
    },
    {
      kind: 'primary',
      label: 'users-permissions.EditPage.submit',
      onClick: () => {},
      type: 'submit',
    },
  ];

  render() {
    const headerActions = this.props.match.params.settingType === 'advanced-settings' && this.props.showButtons ?
      this.pluginHeaderActions : [];
    const noButtonList = this.props.match.params.settingType === 'email-templates';
    const component = this.props.match.params.settingType === 'advanced-settings' ?
      <EditForm onChange={this.props.onChange} values={this.props.modifiedData} /> : (
        <List
          data={this.props.data}
          deleteActionSucceeded={this.props.deleteActionSucceeded}
          deleteData={this.props.deleteData}
          noButton={noButtonList}
          onButtonClick={this.handleButtonClick}
          settingType={this.props.match.params.settingType}
        />
      );
    const hashArray = replace(this.props.location.hash, '#', '').split('::');

    return (
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className={cn('container-fluid', styles.containerFluid)}>
            <PluginHeader
              title={{ id: 'users-permissions.HomePage.header.title' }}
              description={{ id: 'users-permissions.HomePage.header.description' }}
              actions={headerActions}
            />
            <HeaderNav />
            {component}
          </div>
          <PopUpForm
            actionType={hashArray[0]}
            isOpen={!isEmpty(this.props.location.hash)}
            onChange={this.props.onChange}
            onSubmit={(e) => {
              e.preventDefault();
            }}
            settingType={hashArray[1]}
            values={this.props.modifiedData}
          />
        </form>
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
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  showButtons: PropTypes.bool.isRequired,
};


function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      deleteData,
      fetchData,
      onChange,
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
