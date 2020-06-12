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
import { clone, get, includes, isEqual, isEmpty } from 'lodash';
import { Header } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';
import { GlobalContext, HeaderNav, CheckPermissions } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
import { HomePageContextProvider } from '../../contexts/HomePage';
import EditForm from '../../components/EditForm';
import List from '../../components/List';
import PopUpForm from '../../components/PopUpForm';
import selectHomePage from './selectors';
import Wrapper from './Wrapper';
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
import saga from './saga';
import checkFormValidity from './checkFormValidity';
import pluginPermissions from '../../permissions';

/* eslint-disable consistent-return */
/* eslint-disable react/sort-comp */
/* eslint-disable react/no-access-state-in-setstate */

const keyBoardShortCuts = [18, 78];

export class HomePage extends React.Component {
  state = { mapKey: {}, showModalEdit: false };

  pluginHeaderActions = [
    {
      label: this.context.formatMessage({
        id: getTrad('EditPage.cancel'),
      }),
      color: 'cancel',
      onClick: () => this.props.cancelChanges(),
      type: 'button',
      key: 'button-cancel',
      Component: props => (
        <CheckPermissions permissions={pluginPermissions.updateAdvancedSettings}>
          <Button {...props} />
        </CheckPermissions>
      ),
    },
    {
      color: 'success',
      label: this.context.formatMessage({
        id: getTrad('EditPage.submit'),
      }),
      onClick: () => this.props.submit(this.props.match.params.settingType),
      type: 'submit',
      key: 'button-submit',
      Component: props => (
        <CheckPermissions permissions={pluginPermissions.updateAdvancedSettings}>
          <Button {...props} />
        </CheckPermissions>
      ),
    },
  ];

  componentDidMount() {
    this.props.fetchData(this.props.match.params.settingType);
    document.addEventListener('keydown', this.handleKeyBoardShortCut);
    document.addEventListener('keyup', this.handleKeyBoardShortCut);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.dataToEdit !== this.props.dataToEdit) {
      this.setState({ showModalEdit: !isEmpty(nextProps.dataToEdit) });
    }
  }

  UNSAFE_componentWillUpdate(nextProps) {
    const allowedPaths = ['roles', 'providers', 'email-templates', 'advanced'];
    const shouldRedirect =
      allowedPaths.filter(el => el === nextProps.match.params.settingType).length === 0;

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
        `${this.props.location.pathname}#add::${this.props.match.params.settingType}`
      );
    }
  };

  handleSubmit = e => {
    e.preventDefault();
    const modifiedObject = get(this.props.modifiedData, [
      this.getEndPoint(),
      this.props.dataToEdit,
    ]);
    const initObject = get(this.props.initialData, [this.getEndPoint(), this.props.dataToEdit]);
    const formErrors = checkFormValidity(
      this.props.match.params.settingType,
      modifiedObject,
      this.props.dataToEdit
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

  isAdvanded = () => {
    return this.getEndPoint() === 'advanced';
  };

  showLoaders = () => {
    const { data, isLoading, modifiedData } = this.props;

    return (
      (isLoading && get(data, this.getEndPoint()) === undefined && !this.isAdvanded()) ||
      (isLoading && this.isAdvanded() && get(modifiedData, this.getEndPoint()) === undefined)
    );
  };

  static contextType = GlobalContext;

  render() {
    const {
      allowedActions,
      data,
      didCheckErrors,
      formErrors,
      modifiedData,
      initialData,
      match,
      dataToEdit,
      tabs,
    } = this.props;

    const { formatMessage } = this.context;
    const headerActions =
      match.params.settingType === 'advanced' && !isEqual(modifiedData, initialData)
        ? this.pluginHeaderActions
        : [];
    const noButtonList =
      match.params.settingType === 'email-templates' || match.params.settingType === 'providers';
    const values = get(modifiedData, this.getEndPoint(), {});

    return (
      <HomePageContextProvider
        emitEvent={this.context.emitEvent}
        pathname={this.props.location.pathname}
        push={this.props.history.push}
        setDataToEdit={this.props.setDataToEdit}
        unsetDataToEdit={this.props.unsetDataToEdit}
      >
        <form onSubmit={e => e.preventDefault()}>
          <Wrapper className="container-fluid">
            <Header
              title={{
                label: formatMessage({
                  id: getTrad('HomePage.header.title'),
                }),
              }}
              content={formatMessage({
                id: getTrad('HomePage.header.description'),
              })}
              actions={headerActions}
            />
            <HeaderNav links={tabs} style={{ marginTop: '4.6rem' }} />
            {!this.isAdvanded() ? (
              <List
                allowedActions={allowedActions}
                data={get(data, this.getEndPoint(), [])}
                deleteData={this.props.deleteData}
                noButton={noButtonList}
                onButtonClick={this.handleButtonClick}
                settingType={match.params.settingType}
                showLoaders={this.showLoaders()}
                values={values}
              />
            ) : (
              <EditForm
                disabled={!allowedActions.canUpdateAdvancedSettings}
                onChange={this.props.onChange}
                values={values}
                showLoaders={this.showLoaders()}
              />
            )}
          </Wrapper>

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
      </HomePageContextProvider>
    );
  }
}

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
    dispatch
  );
}

const mapStateToProps = selectHomePage();

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withSaga = strapi.injectSaga({ key: 'homePage', saga, pluginId });

export default compose(withSaga, withConnect)(injectIntl(HomePage));
