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

import { HeaderNav, PluginHeader } from 'strapi-helper-plugin';
// import PluginHeader from 'components/PluginHeader';

import pluginId from '../../pluginId';

// Design
import EditForm from '../../components/EditForm';
import List from '../../components/List';
import PopUpForm from '../../components/PopUpForm';

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
  resetProps,
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

  getChildContext = () => ({
    pathname: this.props.location.pathname,
    push: this.props.history.push,
    setDataToEdit: this.props.setDataToEdit,
    unsetDataToEdit: this.props.unsetDataToEdit,
  });

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
    const shouldRedirect =
      allowedPaths.filter(el => el === nextProps.match.params.settingType)
        .length === 0;

    if (shouldRedirect) {
      this.props.history.push('/404');
    }

    if (nextProps.didDeleteData !== this.props.didDeleteData) {
      this.props.fetchData(nextProps.match.params.settingType);
    }
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.match.params.settingType !== this.props.match.params.settingType
    ) {
      this.props.fetchData(this.props.match.params.settingType);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyBoardShortCut);
    document.removeEventListener('keyup', this.handleKeyBoardShortCut);
    this.props.resetProps();
  }

  getEndPoint = () => this.props.match.params.settingType;

  handleKeyBoardShortCut = e => {
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
  };

  handleButtonClick = () => {
    // TODO change open modal URL
    if (this.props.match.params.settingType === 'roles') {
      this.context.emitEvent('willCreateRole');
      this.props.history.push(`${this.props.location.pathname}/create`);
    } else if (this.props.match.params.settingType === 'providers') {
      this.props.history.push(
        `${this.props.location.pathname}#add::${
          this.props.match.params.settingType
        }`,
      );
    }
  };

  handleSubmit = e => {
    e.preventDefault();
    const modifiedObject = get(this.props.modifiedData, [
      this.getEndPoint(),
      this.props.dataToEdit,
    ]);
    const initObject = get(this.props.initialData, [
      this.getEndPoint(),
      this.props.dataToEdit,
    ]);
    const formErrors = checkFormValidity(
      this.props.match.params.settingType,
      modifiedObject,
      this.props.dataToEdit,
    );

    if (isEqual(initObject, modifiedObject)) {
      return this.props.unsetDataToEdit();
    }

    if (isEmpty(formErrors)) {
      this.setState({ showModalEdit: false });
      this.props.submit(this.props.match.params.settingType, this.context);
    } else {
      this.props.setFormErrors(formErrors);
    }
  };

  headerNavLinks = [
    {
      name: 'users-permissions.HeaderNav.link.roles',
      to: '/plugins/users-permissions/roles',
    },
    {
      name: 'users-permissions.HeaderNav.link.providers',
      to: '/plugins/users-permissions/providers',
    },
    {
      name: 'users-permissions.HeaderNav.link.emailTemplates',
      to: '/plugins/users-permissions/email-templates',
    },
    {
      name: 'users-permissions.HeaderNav.link.advancedSettings',
      to: '/plugins/users-permissions/advanced',
    },
  ];

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

  showLoaders = () => {
    const { data, isLoading, modifiedData } = this.props;
    const isAdvanded = this.getEndPoint() === 'advanced';

    return (
      (isLoading &&
        get(data, this.getEndPoint()) === undefined &&
        !isAdvanded) ||
      (isLoading &&
        isAdvanded &&
        get(modifiedData, this.getEndPoint()) === undefined)
    );
  };

  render() {
    const {
      data,
      didCheckErrors,
      formErrors,
      modifiedData,
      initialData,
      match,
      dataToEdit,
    } = this.props;
    const headerActions =
      match.params.settingType === 'advanced' &&
      !isEqual(modifiedData, initialData)
        ? this.pluginHeaderActions
        : [];
    const noButtonList =
      match.params.settingType === 'email-templates' ||
      match.params.settingType === 'providers';
    const component =
      match.params.settingType === 'advanced' ? (
        <EditForm
          onChange={this.props.onChange}
          values={get(modifiedData, this.getEndPoint(), {})}
          showLoaders={this.showLoaders()}
        />
      ) : (
        <List
          data={get(data, this.getEndPoint(), [])}
          deleteData={this.props.deleteData}
          noButton={noButtonList}
          onButtonClick={this.handleButtonClick}
          settingType={match.params.settingType}
          showLoaders={this.showLoaders()}
          values={get(modifiedData, this.getEndPoint(), {})}
        />
      );

    return (
      <div>
        <form onSubmit={e => e.preventDefault()}>
          <div className={cn('container-fluid', styles.containerFluid)}>
            <PluginHeader
              title={{ id: 'users-permissions.HomePage.header.title' }}
              description={{
                id: 'users-permissions.HomePage.header.description',
              }}
              actions={headerActions}
            />
            <HeaderNav links={this.headerNavLinks} />
            {component}
          </div>
          <PopUpForm
            actionType="edit"
            isOpen={this.state.showModalEdit}
            dataToEdit={dataToEdit}
            didCheckErrors={didCheckErrors}
            formErrors={formErrors}
            onChange={this.props.onChange}
            onSubmit={this.handleSubmit}
            settingType={match.params.settingType}
            values={get(modifiedData, [this.getEndPoint(), dataToEdit], {})}
          />
        </form>
      </div>
    );
  }
}

HomePage.childContextTypes = {
  pathname: PropTypes.string,
  push: PropTypes.func,
  setDataToEdit: PropTypes.func,
  unsetDataToEdit: PropTypes.func,
};

HomePage.contextTypes = {
  emitEvent: PropTypes.func,
};

HomePage.defaultProps = {};

HomePage.propTypes = {
  cancelChanges: PropTypes.func.isRequired,
  data: PropTypes.object.isRequired,
  dataToEdit: PropTypes.string.isRequired,
  deleteData: PropTypes.func.isRequired,
  didCheckErrors: PropTypes.bool.isRequired,
  didDeleteData: PropTypes.bool.isRequired,
  fetchData: PropTypes.func.isRequired,
  formErrors: PropTypes.array.isRequired,
  history: PropTypes.object.isRequired,
  initialData: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
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
      resetProps,
      setDataToEdit,
      setFormErrors,
      submit,
      unsetDataToEdit,
    },
    dispatch,
  );
}

const mapStateToProps = selectHomePage();

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);
const withReducer = strapi.injectReducer({
  key: 'homePage',
  reducer,
  pluginId,
});
const withSaga = strapi.injectSaga({ key: 'homePage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(injectIntl(HomePage));
