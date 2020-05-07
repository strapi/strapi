/**
 *
 * EditPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import { FormattedMessage } from 'react-intl';
import { findIndex, get, isEmpty, isEqual, size } from 'lodash';
// Design
import {
  GlobalContext,
  BackHeader,
  InputsIndex as Input,
  LoadingIndicator,
  LoadingIndicatorPage,
} from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import { EditPageContextProvider } from '../../contexts/EditPage';
import InputSearch from '../../components/InputSearchContainer';
import Plugins from '../../components/Plugins';
import Policies from '../../components/Policies';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
// Actions
import {
  addUser,
  getPermissions,
  getPolicies,
  getRole,
  getUser,
  onCancel,
  onChangeInput,
  onClickAdd,
  onClickDelete,
  selectAllActions,
  setActionType,
  setErrors,
  setForm,
  setInputPoliciesPath,
  setRoleId,
  setShouldDisplayPolicieshint,
  submit,
  resetProps,
  resetShouldDisplayPoliciesHint,
} from './actions';

// Selectors
import makeSelectEditPage from './selectors';
import saga from './saga';

import { Loader, Title, Separator, Wrapper } from './Components';

/* eslint-disable react/sort-comp */

export class EditPage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  getChildContext = () => ({
    onChange: this.props.onChangeInput,
    selectAllActions: this.props.selectAllActions,
    setInputPoliciesPath: this.props.setInputPoliciesPath,
    setShouldDisplayPolicieshint: this.props.setShouldDisplayPolicieshint,
    resetShouldDisplayPoliciesHint: this.props.resetShouldDisplayPoliciesHint,
  });

  static contextType = GlobalContext;

  componentDidMount() {
    this.props.setActionType(this.props.match.params.actionType);
    this.props.getPolicies();

    if (this.props.match.params.actionType === 'create') {
      // Set reducer modifiedData
      this.props.setForm();
      // Get the available permissions
      this.props.getPermissions();
    } else {
      this.props.setRoleId(this.props.match.params.id);
      this.props.getRole(this.props.match.params.id);
    }
  }

  componentDidUpdate(prevProps) {
    // Redirect user to HomePage if submit ok
    if (prevProps.editPage.didSubmit !== this.props.editPage.didSubmit) {
      this.props.history.push(`/plugins/${pluginId}/roles`);
    }
  }

  componentWillUnmount() {
    // Empty formErrors
    this.props.setErrors([]);
    // Empty modifiedData so prev values aren't displayed when loading
    this.props.resetProps();
    this.props.resetShouldDisplayPoliciesHint();
  }

  handleSubmit = () => {
    // Check if the name field is filled
    if (isEmpty(get(this.props.editPage, ['modifiedData', 'name']))) {
      return this.props.setErrors([
        {
          name: 'name',
          errors: [{ id: getTrad('EditPage.form.roles.name.error') }],
        },
      ]);
    }

    return this.props.submit(this.context);
  };

  showLoaderForm = () => {
    const {
      editPage: { modifiedData },
      match: {
        params: { actionType },
      },
    } = this.props;

    return actionType !== 'create' && isEmpty(modifiedData);
  };

  showLoaderPermissions = () => {
    const {
      editPage: { modifiedData },
    } = this.props;

    return isEmpty(get(modifiedData, ['permissions']));
  };

  renderFirstBlock = () => (
    <>
      <div className="col-md-6">
        <div className="row">
          <Input
            autoFocus
            customBootstrapClass="col-md-12"
            errors={get(this.props.editPage, [
              'formErrors',
              findIndex(this.props.editPage.formErrors, ['name', 'name']),
              'errors',
            ])}
            didCheckErrors={this.props.editPage.didCheckErrors}
            label={{ id: getTrad('EditPage.form.roles.label.name') }}
            name="name"
            onChange={this.props.onChangeInput}
            type="text"
            validations={{ required: true }}
            value={get(this.props.editPage, ['modifiedData', 'name'])}
          />
        </div>
        <div className="row">
          <Input
            customBootstrapClass="col-md-12"
            label={{
              id: getTrad('EditPage.form.roles.label.description'),
            }}
            name="description"
            onChange={this.props.onChangeInput}
            type="textarea"
            validations={{ required: true }}
            value={get(this.props.editPage, ['modifiedData', 'description'])}
          />
        </div>
      </div>
      <InputSearch
        addUser={this.props.addUser}
        didDeleteUser={this.props.editPage.didDeleteUser}
        didFetchUsers={this.props.editPage.didFetchUsers}
        didGetUsers={this.props.editPage.didGetUsers}
        getUser={this.props.getUser}
        label={{
          id: getTrad('EditPage.form.roles.label.users'),
          params: {
            number: size(get(this.props.editPage, ['modifiedData', 'users'])),
          },
        }}
        onClickAdd={itemToAdd => {
          this.context.emitEvent('didAssociateUserToRole');
          this.props.onClickAdd(itemToAdd);
        }}
        onClickDelete={this.props.onClickDelete}
        name="users"
        type="text"
        users={get(this.props.editPage, 'users')}
        validations={{ required: true }}
        values={get(this.props.editPage, ['modifiedData', 'users'])}
      />
      <div className="col-md-12">
        <Separator />
      </div>
    </>
  );

  render() {
    const { formatMessage, plugins: appPlugins } = this.context;
    const pluginHeaderTitle =
      this.props.match.params.actionType === 'create'
        ? getTrad('EditPage.header.title.create')
        : getTrad('EditPage.header.title');
    const pluginHeaderDescription =
      this.props.match.params.actionType === 'create'
        ? getTrad('EditPage.header.description.create')
        : getTrad('EditPage.header.description');
    const pluginHeaderActions = [
      {
        label: formatMessage({ id: getTrad('EditPage.cancel') }),
        color: 'cancel',
        onClick: this.props.onCancel,
        type: 'button',
        key: 'button-cancel',
      },
      {
        color: 'success',
        label: formatMessage({ id: getTrad('EditPage.submit') }),
        onClick: this.handleSubmit,
        type: 'submit',
        disabled: isEqual(this.props.editPage.modifiedData, this.props.editPage.initialData),
        key: 'button-submit',
      },
    ];

    if (this.showLoaderForm()) {
      return <LoadingIndicatorPage />;
    }

    return (
      <EditPageContextProvider
        appPlugins={appPlugins}
        onChange={this.props.onChangeInput}
        selectAllActions={this.props.selectAllActions}
        setInputPoliciesPath={this.props.setInputPoliciesPath}
        setShouldDisplayPolicieshint={this.props.setShouldDisplayPolicieshint}
        resetShouldDisplayPoliciesHint={this.props.resetShouldDisplayPoliciesHint}
      >
        <Wrapper>
          <BackHeader onClick={() => this.props.history.goBack()} />
          <div className="container-fluid">
            <FormattedMessage
              id={pluginHeaderTitle}
              values={{ name: get(this.props.editPage.initialData, 'name') }}
            >
              {title => {
                return (
                  <FormattedMessage
                    id={pluginHeaderDescription}
                    values={{
                      description: get(this.props.editPage.initialData, 'description', ''),
                    }}
                  >
                    {description => {
                      return (
                        <Header
                          title={{
                            label: title,
                          }}
                          content={description}
                          actions={pluginHeaderActions}
                        />
                      );
                    }}
                  </FormattedMessage>
                );
              }}
            </FormattedMessage>
            <div className="form-wrapper row">
              <div className="col-md-12">
                <div className="form-container">
                  <Title>
                    <FormattedMessage id={getTrad('EditPage.form.roles')} />
                  </Title>
                  <form>
                    <div className="row">
                      {this.showLoaderForm() ? (
                        <Loader>
                          <LoadingIndicator />
                        </Loader>
                      ) : (
                        this.renderFirstBlock()
                      )}
                    </div>
                    <div className="row" style={{ marginRight: '-30px' }}>
                      {this.showLoaderPermissions() && (
                        <Loader style={{ minHeight: '400px' }}>
                          <LoadingIndicator />
                        </Loader>
                      )}
                      {!this.showLoaderPermissions() && (
                        <Plugins
                          plugins={get(this.props.editPage, ['modifiedData', 'permissions'])}
                        />
                      )}
                      <Policies
                        shouldDisplayPoliciesHint={this.props.editPage.shouldDisplayPoliciesHint}
                        inputSelectName={this.props.editPage.inputPoliciesPath}
                        routes={this.props.editPage.routes}
                        selectOptions={this.props.editPage.policies}
                        values={this.props.editPage.modifiedData}
                      />
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </Wrapper>
      </EditPageContextProvider>
    );
  }
}

EditPage.childContextTypes = {
  onChange: PropTypes.func.isRequired,
  selectAllActions: PropTypes.func.isRequired,
  setInputPoliciesPath: PropTypes.func.isRequired,
  setShouldDisplayPolicieshint: PropTypes.func.isRequired,
  resetShouldDisplayPoliciesHint: PropTypes.func.isRequired,
};

EditPage.propTypes = {
  addUser: PropTypes.func.isRequired,
  editPage: PropTypes.object.isRequired,
  getPermissions: PropTypes.func.isRequired,
  getPolicies: PropTypes.func.isRequired,
  getRole: PropTypes.func.isRequired,
  getUser: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onChangeInput: PropTypes.func.isRequired,
  onClickAdd: PropTypes.func.isRequired,
  onClickDelete: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
  resetShouldDisplayPoliciesHint: PropTypes.func.isRequired,
  selectAllActions: PropTypes.func.isRequired,
  setActionType: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  setForm: PropTypes.func.isRequired,
  setInputPoliciesPath: PropTypes.func.isRequired,
  setRoleId: PropTypes.func.isRequired,
  setShouldDisplayPolicieshint: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  editPage: makeSelectEditPage(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addUser,
      getPermissions,
      getPolicies,
      getRole,
      getUser,
      onCancel,
      onChangeInput,
      onClickAdd,
      onClickDelete,
      selectAllActions,
      setActionType,
      setErrors,
      setForm,
      setInputPoliciesPath,
      setRoleId,
      setShouldDisplayPolicieshint,
      submit,
      resetProps,
      resetShouldDisplayPoliciesHint,
    },
    dispatch
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withSaga = strapi.injectSaga({ key: 'editPage', saga, pluginId });

export default compose(withSaga, withConnect)(EditPage);
