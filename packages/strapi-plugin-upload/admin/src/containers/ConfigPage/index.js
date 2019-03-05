/**
 *
 * ConfigPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { findIndex, get, isEmpty } from 'lodash';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import ContainerFluid from 'components/ContainerFluid';
import HeaderNav from 'components/HeaderNav';
import PluginHeader from 'components/PluginHeader';

import pluginId from '../../pluginId';

// Plugin's components
import EditForm from '../../components/EditForm';

import {
  getSettings,
  onCancel,
  onChange,
  setErrors,
  submit,
} from './actions';

import reducer from './reducer';
import saga from './saga';
import selectConfigPage from './selectors';

class ConfigPage extends React.Component {
  componentDidMount() {
    this.getSettings(this.props);
  }

  componentWillReceiveProps(nextProps) {
    // Get new settings on navigation change
    if (nextProps.match.params.env !== this.props.match.params.env) {
      this.getSettings(nextProps);
    }

    // Redirect the user to the upload list after modifying is provider
    if (nextProps.submitSuccess !== this.props.submitSuccess) {
      this.props.history.push('/plugins/upload');
    }
  }

  getSelectedProviderIndex = () => findIndex(this.props.settings.providers, ['provider', get(this.props.modifiedData, 'provider')]);

  /**
   * Get Settings depending on the props
   * @param  {Object} props
   * @return {Func}       calls the saga that gets the current settings
   */
  getSettings = (props) => {
    const { match: { params: { env} } } = props;
    this.props.getSettings(env);
  }

  generateLinks = () => {
    const headerNavLinks = this.props.appEnvironments.reduce((acc, current) => {
      const link = Object.assign(current, { to: `/plugins/upload/configurations/${current.name}` });
      acc.push(link);
      return acc;
    }, []).sort(link => link.name === 'production');

    return headerNavLinks;
  }

  handleSubmit = (e) => {
    e.preventDefault();
    const formErrors = Object.keys(get(this.props.settings, ['providers', this.getSelectedProviderIndex(), 'auth'], {})).reduce((acc, current) => {
      if (isEmpty(get(this.props.modifiedData, current, ''))) {
        acc.push({
          name: current,
          errors: [{ id: 'components.Input.error.validation.required' }],
        });
      }
      return acc;
    }, []);

    if (!isEmpty(formErrors)) {
      return this.props.setErrors(formErrors);
    }

    return this.props.submit();
  }

  pluginHeaderActions = [
    {
      kind: 'secondary',
      label: 'app.components.Button.cancel',
      onClick: this.props.onCancel,
      type: 'button',
    },
    {
      kind: 'primary',
      label: 'app.components.Button.save',
      onClick: this.handleSubmit,
      type: 'submit',
    },
  ];

  render() {
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <ContainerFluid>
            <PluginHeader
              actions={this.pluginHeaderActions}
              description={{ id: 'upload.ConfigPage.description' }}
              title={{ id: 'upload.ConfigPage.title'}}
            />
            <HeaderNav links={this.generateLinks()} />
            <EditForm
              didCheckErrors={this.props.didCheckErrors}
              formErrors={this.props.formErrors}
              modifiedData={this.props.modifiedData}
              onChange={this.props.onChange}
              selectedProviderIndex={this.getSelectedProviderIndex()}
              settings={this.props.settings}
            />
          </ContainerFluid>
        </form>
      </div>
    );
  }
}

ConfigPage.contextTypes = {};

ConfigPage.defaultProps = {
  appEnvironments: [],
  formErrors: [],
  settings: {
    providers: [],
  },
};

ConfigPage.propTypes = {
  appEnvironments: PropTypes.array,
  didCheckErrors: PropTypes.bool.isRequired,
  formErrors: PropTypes.array,
  getSettings: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  setErrors: PropTypes.func.isRequired,
  settings: PropTypes.object,
  submit: PropTypes.func.isRequired,
  submitSuccess: PropTypes.bool.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getSettings,
      onCancel,
      onChange,
      setErrors,
      submit,
    },
    dispatch,
  );
}

const mapStateToProps = selectConfigPage();

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = strapi.injectReducer({ key: 'configPage', reducer, pluginId });
const withSaga = strapi.injectSaga({ key: 'configPage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ConfigPage);
