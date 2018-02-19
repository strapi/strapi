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
import { clone, get, includes, isEqual, isEmpty } from 'lodash';

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
  cancelChanges,
  deleteData,
  fetchData,
  onChange,
  setDataToEdit,
  setFormErrors,
  submit,
  unsetDataToEdit,
} from './actions';

import reducer from './reducer';
import saga from './saga';

import checkFormValidity from './checkFormValidity';

const keyBoardShortCuts = [18, 78];

export class HomePage extends React.Component {
  state = { mapKey: {}, showModalEdit: false };

  getChildContext = () => (
    {
      setDataToEdit: this.props.setDataToEdit,
      unsetDataToEdit: this.props.unsetDataToEdit,
    }
  );

  componentDidMount() {
    this.props.fetchData(this.props.match.params.settingType);
    document.addEventListener('keydown', this.handleKeyBoardShortCut);
    document.addEventListener('keyup', this.handleKeyBoardShortCut);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.dataToEdit !== this.props.dataToEdit) {
      this.setState({ showModalEdit: !isEmpty(nextProps.dataToEdit) });
    }
  }

  componentWillUpdate(nextProps) {
    const allowedPaths = ['roles', 'providers', 'email-templates', 'advanced'];
    const shouldRedirect = allowedPaths.filter(el => el === nextProps.match.params.settingType).length === 0;

    if (shouldRedirect) {
      this.props.history.push('/404');
    }

    if (nextProps.didDeleteData !== this.props.didDeleteData) {
      this.props.fetchData(nextProps.match.params.settingType);
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
    // TODO change open modal URL
    if (this.props.match.params.settingType === 'roles') {
      this.props.history.push(`${this.props.location.pathname}/create`);
    } else if (this.props.match.params.settingType === 'providers') {
      this.props.history.push(`${this.props.location.pathname}#add::${this.props.match.params.settingType}`);
    }
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const modifiedObject = get(this.props.modifiedData, this.props.dataToEdit);
    const initObject = get(this.props.initialData, this.props.dataToEdit);
    const formErrors = checkFormValidity(this.props.match.params.settingType, modifiedObject, this.props.dataToEdit);

    if (isEqual(initObject, modifiedObject)) {
      return this.props.unsetDataToEdit();
    }

    if (isEmpty(formErrors)) {
      this.setState({ showModalEdit: false });
      this.props.submit(this.props.match.params.settingType);
    } else {
      this.props.setFormErrors(formErrors);
    }
  }

  pluginHeaderActions = [
    {
      label: 'users-permissions.EditPage.cancel',
      kind: 'secondary',
      onClick: () => this.props.cancelChanges(),
      type: 'button',
    },
    {
      kind: 'primary',
      label: 'users-permissions.EditPage.submit',
      onClick: () => this.props.submit(this.props.match.params.settingType),
      type: 'submit',
    },
  ];

  render() {
    const { didCheckErrors, formErrors, modifiedData, initialData, match, dataToEdit } = this.props;
    const headerActions = match.params.settingType === 'advanced' && !isEqual(modifiedData, initialData) ?
      this.pluginHeaderActions : [];
    const noButtonList = match.params.settingType === 'email-templates' || match.params.settingType === 'providers';
    const component = match.params.settingType === 'advanced' ?
      <EditForm onChange={this.props.onChange} values={modifiedData} /> : (
        <List
          data={this.props.data}
          deleteData={this.props.deleteData}
          noButton={noButtonList}
          onButtonClick={this.handleButtonClick}
          settingType={match.params.settingType}
          values={modifiedData}
        />
      );

    return (
      <div>
        <form onSubmit={(e) => e.preventDefault()}>
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
            actionType={'edit'}
            isOpen={this.state.showModalEdit}
            dataToEdit={dataToEdit}
            didCheckErrors={didCheckErrors}
            formErrors={formErrors}
            onChange={this.props.onChange}
            onSubmit={this.handleSubmit}
            settingType={match.params.settingType}
            values={modifiedData[dataToEdit] || {}}
          />
        </form>
      </div>
    );
  }
}

HomePage.childContextTypes = {
  setDataToEdit: PropTypes.func,
  unsetDataToEdit: PropTypes.func,
};

HomePage.defaultProps = {};

HomePage.propTypes = {
  cancelChanges: PropTypes.func.isRequired,
  data: PropTypes.array.isRequired,
  dataToEdit: PropTypes.string.isRequired,
  deleteData: PropTypes.func.isRequired,
  didCheckErrors: PropTypes.bool.isRequired,
  didDeleteData: PropTypes.bool.isRequired,
  fetchData: PropTypes.func.isRequired,
  formErrors: PropTypes.array.isRequired,
  history: PropTypes.object.isRequired,
  initialData: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  setDataToEdit: PropTypes.func.isRequired,
  setFormErrors: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
  unsetDataToEdit: PropTypes.func.isRequired,
};


function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      cancelChanges,
      deleteData,
      fetchData,
      onChange,
      setDataToEdit,
      setFormErrors,
      submit,
      unsetDataToEdit,
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
