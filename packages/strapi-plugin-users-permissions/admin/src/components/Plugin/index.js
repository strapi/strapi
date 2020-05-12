/**
 *
 * Plugin
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { capitalize, get, isEmpty, map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { EditPageContext } from '../../contexts/EditPage';
import Controller from '../Controller';

import {
  Banner,
  Chevron,
  ControllerWrapper,
  Description,
  Icon,
  Name,
  Wrapper,
} from './Components';

class Plugin extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { collapse: false };

  static contextType = EditPageContext;

  componentDidMount() {
    // Open the application's permissions section if there are APIs
    if (
      this.props.name === 'application' &&
      !isEmpty(get(this.props.plugin, 'controllers'))
    ) {
      this.props.changePluginSelected('application');
      this.setState({ collapse: !this.state.collapse });
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (
      nextProps.pluginSelected !== this.props.pluginSelected &&
      nextProps.pluginSelected !== this.props.name
    ) {
      this.context.resetShouldDisplayPoliciesHint();
      this.setState({ collapse: false });
    }
  }

  handleClick = () => {
    this.props.changePluginSelected(this.props.name);

    if (!isEmpty(get(this.props.plugin, 'controllers'))) {
      this.setState({ collapse: !this.state.collapse });
    }

    if (this.state.collapse) {
      this.context.resetShouldDisplayPoliciesHint();
    }
  };

  render() {
    const { appPlugins } = this.context;
    const { plugin } = this.props;
    const divStyle = this.state.collapse ? { marginBottom: '.4rem' } : {};
    const pluginId = get(plugin, ['information', 'id'], null);
    const icon = get(appPlugins, [pluginId, 'pluginLogo'], null);
    const emptyApplication = !isEmpty(get(this.props.plugin, 'controllers'));

    if (!emptyApplication) {
      return <div />;
    }

    return (
      <Wrapper style={divStyle}>
        <Banner onClick={this.handleClick}>
          <div>
            {this.props.name !== 'application' && (
              <Icon>{icon && <img src={icon} alt="icon" />}</Icon>
            )}
            <Name>{this.props.name}</Name>
            &nbsp;—&nbsp;
            <Description>
              {this.props.name === 'application' ? (
                <FormattedMessage id="users-permissions.Plugin.permissions.application.description" />
              ) : (
                <FormattedMessage
                  id="users-permissions.Plugin.permissions.plugins.description"
                  values={{ name: capitalize(this.props.name) }}
                />
              )}
            </Description>
            {emptyApplication && (
              <Chevron>
                {this.state.collapse ? (
                  <FontAwesomeIcon icon="chevron-up" />
                ) : (
                  <FontAwesomeIcon icon="chevron-down" />
                )}
              </Chevron>
            )}
          </div>
        </Banner>
        <Collapse isOpen={this.state.collapse}>
          <div />
          <ControllerWrapper>
            {map(
              get(this.props.plugin, 'controllers'),
              (controllerActions, key) => (
                <Controller
                  inputNamePath={`permissions.${this.props.name}`}
                  isOpen={this.state.collapse}
                  key={key}
                  name={key}
                  actions={controllerActions}
                  resetInputBackground={this.state.resetInputBackground}
                />
              )
            )}
          </ControllerWrapper>
        </Collapse>
      </Wrapper>
    );
  }
}

Plugin.defaultProps = {
  name: '',
  plugin: {
    description: 'users-permissions.Plugin.permissions.description.empty',
    controllers: {},
    information: {},
  },
};

Plugin.propTypes = {
  changePluginSelected: PropTypes.func.isRequired,
  name: PropTypes.string,
  plugin: PropTypes.shape({
    description: PropTypes.string,
    information: PropTypes.shape({
      logo: PropTypes.string,
    }),
  }),
  pluginSelected: PropTypes.string.isRequired,
};

export default Plugin;
