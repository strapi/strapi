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
import cn from 'classnames';

// Design
import BackHeader from 'components/BackHeader';
import Input from 'components/Input';
import InputSearch from 'components/InputSearch';
import PluginHeader from 'components/PluginHeader';
import Plugins from 'components/Plugins';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';

// Actions
import {
  addUser,
  getPermissions,
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
  setRoleId,
  submit,
} from './actions';

// Selectors
import makeSelectEditPage from './selectors';

import reducer from './reducer';
import saga from './saga';

import styles from './styles.scss';

export class EditPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  getChildContext = () => (
    {
      onChange: this.props.onChangeInput,
      selectAllActions: this.props.selectAllActions,
    }
  );

  componentDidMount() {
    this.props.setActionType(this.props.match.params.actionType);

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

  componentWillReceiveProps(nextProps) {
    // Redirect user to HomePage if submit ok
    if (nextProps.editPage.didSubmit !== this.props.editPage.didSubmit) {
      this.props.history.push('/plugins/users-permissions/roles');
    }
  }

  componentWillUnmount() {
    // Empty formErrors
    this.props.setErrors([]);
  }

  handleSubmit = () => {
    // Check if the name field is filled
    if (isEmpty(get(this.props.editPage, ['modifiedData', 'name']))) {
      return this.props.setErrors([{ name: 'name', errors: [{ id: 'users-permissions.EditPage.form.roles.name.error' }] }]);
    }

    this.props.submit();
  }

  pluginHeaderActions = [
    {
      label: 'users-permissions.EditPage.cancel',
      kind: 'secondary',
      onClick: this.props.onCancel,
      type: 'button',
    },
    {
      kind: 'primary',
      label: 'users-permissions.EditPage.submit',
      onClick: this.handleSubmit,
      type: 'submit',
    },
  ];

  render() {
    const pluginHeaderTitle = this.props.match.params.actionType === 'create' ?
      'users-permissions.EditPage.header.title.create'
      : 'users-permissions.EditPage.header.title';
    const pluginHeaderDescription = this.props.match.params.actionType === 'create' ?
      'users-permissions.EditPage.header.description.create'
      : 'users-permissions.EditPage.header.description';
    const pluginHeaderActions = !isEqual(this.props.editPage.modifiedData, this.props.editPage.initialData) ? this.pluginHeaderActions : [];

    return (
      <div>
        <BackHeader onClick={() => this.props.history.goBack()} />
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            title={{
              id: pluginHeaderTitle,
              values: {
                name: get(this.props.editPage.initialData, 'name'),
              },
            }}
            description={{
              id: pluginHeaderDescription,
              values: {
                description: get(this.props.editPage.initialData, 'description') || '',
              },
            }}
            actions={pluginHeaderActions}
          />
          <div className={cn('row', styles.container)}>
            <div className="col-md-12">
              <div className={styles.main_wrapper}>
                <div className={styles.titleContainer}>
                  <FormattedMessage id="users-permissions.EditPage.form.roles" />
                </div>
                <form className={styles.form}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="row">
                        <Input
                          autoFocus
                          customBootstrapClass="col-md-12"
                          errors={get(this.props.editPage, ['formErrors', findIndex(this.props.editPage.formErrors, ['name', 'name']), 'errors'])}
                          didCheckErrors={this.props.editPage.didCheckErrors}
                          label="users-permissions.EditPage.form.roles.label.name"
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
                          label="users-permissions.EditPage.form.roles.label.description"
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
                      label="users-permissions.EditPage.form.roles.label.users"
                      labelValues={{ number: size(get(this.props.editPage, ['modifiedData', 'users'])) }}
                      onClickAdd={this.props.onClickAdd}
                      onClickDelete={this.props.onClickDelete}
                      name="users"
                      type="text"
                      users={get(this.props.editPage, 'users')}
                      validations={{ required: true }}
                      values={get(this.props.editPage, ['modifiedData', 'users'])}
                    />
                    <div className="col-md-12">
                      <div className={styles.separator} />
                    </div>
                  </div>
                  <div className="row">
                    <Plugins
                      plugins={get(this.props.editPage, ['modifiedData', 'permissions'])}
                    />
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

EditPage.childContextTypes = {
  onChange: PropTypes.func.isRequired,
  selectAllActions: PropTypes.func.isRequired,
};

EditPage.propTypes = {
  addUser: PropTypes.func.isRequired,
  editPage: PropTypes.object.isRequired,
  getPermissions: PropTypes.func.isRequired,
  getRole: PropTypes.func.isRequired,
  getUser: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onChangeInput: PropTypes.func.isRequired,
  onClickAdd: PropTypes.func.isRequired,
  onClickDelete: PropTypes.func.isRequired,
  selectAllActions: PropTypes.func.isRequired,
  setActionType: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  setForm: PropTypes.func.isRequired,
  setRoleId: PropTypes.func.isRequired,
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
      setRoleId,
      submit,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = injectReducer({ key: 'editPage', reducer });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = injectSaga({ key: 'editPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(EditPage);
