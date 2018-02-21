/**
 *
 * EditPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import cn from 'classnames';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import BackHeader from 'components/BackHeader';
import PluginHeader from 'components/PluginHeader';

// App selectors
import { makeSelectModels, makeSelectSchema } from 'containers/App/selectors';

import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';
import getQueryParameters from 'utils/getQueryParameters';

import {
  initModelProps,
} from './actions';

import reducer from './reducer';
import saga from './saga';
import makeSelectEditPage from './selectors';
import styles from './styles.scss';

export class EditPage extends React.Component {
  componentDidMount() {
    this.props.initModelProps(this.getModelName(), this.isEditing());
  }

  /**
   * Retrive the model
   * @type {Object}
   */
  getModel = () => get(this.props.models, ['models', this.getModelName()]) || get(this.props.models, ['plugins', this.getSource(), 'models', this.getModelName()]);

  /**
   * Retrieve the model's attributes
   * @return {Object}
   */
  getModelAttributes = () => this.getModel().attributes;

  /**
   * Retrieve the model's name
   * @return {String} model's name
   */
  getModelName = () => this.props.match.params.slug.toLowerCase();

  /**
   * Retrieve the model's source
   * @return {String}
   */
  getSource = () => getQueryParameters(this.props.location.search, 'source');

  componentDidCatch(error, info) {
    console.log('err', error);
    console.log('info', info);
  }

  isEditing = () => this.props.match.params.id === 'create';

  pluginHeaderActions = [
    {
      label: 'content-manager.containers.Edit.reset',
      kind: 'secondary',
      onClick: () => {},
      type: 'button',
    },
    {
      kind: 'primary',
      label: this.isEditing() ? 'content-manager.containers.Edit.editing' : 'content-manager.containers.Edit.submit',
      onClick: () => {},
      type: 'submit',
    },
  ];

  render() {
    const { editPage } = this.props;

    return (
      <div>
        <BackHeader onClick={() => this.props.history.goBack()} />
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            actions={this.pluginHeaderActions}
            title={{ id: editPage.pluginHeaderTitle }}
          />
        </div>
      </div>
    );
  }
}

EditPage.defaultProps = {
  models: {},
};

EditPage.propTypes = {
  editPage: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
  initModelProps: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  models: PropTypes.object,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      initModelProps,
    },
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({
  editPage: makeSelectEditPage(),
  models: makeSelectModels(),
  schema: makeSelectSchema(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'editPage', reducer });
const withSaga = injectSaga({ key: 'editPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(EditPage);
