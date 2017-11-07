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
import { get } from 'lodash';
import cn from 'classnames';

// Design
import BackHeader from 'components/BackHeader';
import Input from 'components/Input';
import InputSearch from 'components/InputSearch';
import PluginHeader from 'components/PluginHeader';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';

// Actions
import {
  onCancel,
  onChangeInput,
} from './actions';

// Selectors
import makeSelectEditPage from './selectors';

import reducer from './reducer';
import saga from './saga';

import styles from './styles.scss';

export class EditPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
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
      onClick: () => console.log('submit'),
      type: 'submit',
    },
  ];

  render() {
    const pluginHeaderTitle = this.props.match.params.id === 'create' ?
      'users-permissions.EditPage.header.title.create'
      : 'users-permissions.EditPage.header.title';
    const pluginHeaderDescription = this.props.match.params.id === 'create' ?
      'users-permissions.EditPage.header.description.create'
      : 'users-permissions.EditPage.header.description';

    const pluginHeaderActions = this.props.editPage.showButtons ? this.pluginHeaderActions : [];
    return (
      <div>
        <BackHeader onClick={() => this.props.history.goBack()} />
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            title={{
              id: pluginHeaderTitle,
              values: {
                name: '',
              },
            }}
            description={{
              id: pluginHeaderDescription,
              values: {
                description: '',
              },
            }}
            actions={pluginHeaderActions}
          />
          <div className="row">
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
                          customBootstrapClass="col-md-12"
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
                      label="users-permissions.EditPage.form.roles.label.users"
                      labelValues={{ number: 0 }}
                      onChange={() => console.log('change')}
                      type="text"
                      validations={{ required: true }}
                      value=""
                      name="users"
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

EditPage.propTypes = {
  history: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onChangeInput: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  editPage: makeSelectEditPage(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      onCancel,
      onChangeInput,
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
