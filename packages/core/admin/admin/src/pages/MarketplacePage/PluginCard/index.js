/**
 *
 * PluginCard
 *
 */
/* eslint-disable */
import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Button, PopUpWarning, CheckPermissions } from '@strapi/helper-plugin';
import adminPermissions from '../../../permissions';
import Wrapper from './Wrapper';

/* eslint-disable react/no-unused-state */
class PluginCard extends React.Component {
  state = {
    boostrapCol: 'col-lg-4',
    showModalAutoReload: false,
    showModalEnv: false,
  };

  componentDidMount() {
    // Listen window resize.
    window.addEventListener('resize', this.setBoostrapCol);
    this.setBoostrapCol();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.setBoostrapCol);
  }

  setBoostrapCol = () => {
    let boostrapCol = 'col-lg-4';

    if (window.innerWidth > 1680) {
      boostrapCol = 'col-lg-3';
    }

    if (window.innerWidth > 2300) {
      boostrapCol = 'col-lg-2';
    }

    this.setState({ boostrapCol });
  };

  handleDownloadPlugin = e => {
    const {
      autoReload,
      currentEnvironment,
      downloadPlugin,
      history: { push },
      isAlreadyInstalled,
      plugin: { id },
    } = this.props;

    if (!autoReload) {
      this.setState({ showModalAutoReload: true });
    } else if (currentEnvironment !== 'development') {
      this.setState({ showModalEnv: true });
    } else if (!isAlreadyInstalled) {
      downloadPlugin(id);
    } else {
      push('/list-plugins');
    }
  };

  render() {
    const buttonClass = !this.props.isAlreadyInstalled ? 'primary' : 'secondary';
    const buttonLabel = this.props.isAlreadyInstalled
      ? 'app.components.PluginCard.Button.label.install'
      : 'app.components.PluginCard.Button.label.download';

    const settingsComponent = null;

    const descriptions = {
      short:
        this.props.plugin.id === 'support-us' ? (
          <FormattedMessage id={this.props.plugin.description.short} />
        ) : (
          this.props.plugin.description.short
        ),
      long:
        this.props.plugin.id === 'support-us' ? (
          <FormattedMessage
            id={this.props.plugin.description.long || this.props.plugin.description.short}
          />
        ) : (
          this.props.plugin.description.long || this.props.plugin.description.short
        ),
    };

    return (
      <Wrapper className={this.state.boostrapCol}>
        <div className="wrapper">
          <div className="cardTitle">
            <div className="frame">
              <span className="helper" />
              <img src={this.props.plugin.logo} alt="icon" />
            </div>
            <div
              onClick={e => {
                // FIXME: dead link as we are changing the naming. Would be better to use a url comming from the api call directly
                window.open(
                  `https://github.com/strapi/strapi/tree/master/packages/strapi-plugin-${this.props.plugin.id}`,
                  '_blank'
                );
              }}
            >
              {this.props.plugin.name} <i className="fa fa-external-link-alt" />
            </div>
          </div>
          <div className="cardDescription">{descriptions.long}</div>
          <div className="cardFooter" onClick={e => e.stopPropagation()}>
            <div className="cardFooterButton">
              <CheckPermissions permissions={adminPermissions.marketplace.install}>
                <Button
                  className={`${buttonClass} button`}
                  label={buttonLabel}
                  type="button"
                  onClick={this.handleDownloadPlugin}
                />
              </CheckPermissions>
            </div>
            {this.props.isAlreadyInstalled ? (
              settingsComponent
            ) : (
              <div className="compatible">
                <i className={`fa fa-${this.props.plugin.isCompatible ? 'check' : 'times'}`} />
                <FormattedMessage
                  id={`app.components.PluginCard.compatible${
                    this.props.plugin.id === 'support-us' ? 'Community' : ''
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        <PopUpWarning
          content={{
            message: 'app.components.PluginCard.PopUpWarning.install.impossible.autoReload.needed',
            title: 'app.components.PluginCard.PopUpWarning.install.impossible.title',
            confirm: 'app.components.PluginCard.PopUpWarning.install.impossible.confirm',
          }}
          isOpen={this.state.showModalAutoReload}
          onlyConfirmButton
          onConfirm={() => this.setState({ showModalAutoReload: false })}
          popUpWarningType="warning"
        />
        <PopUpWarning
          content={{
            message: 'app.components.PluginCard.PopUpWarning.install.impossible.environment',
            title: 'app.components.PluginCard.PopUpWarning.install.impossible.title',
            confirm: 'app.components.PluginCard.PopUpWarning.install.impossible.confirm',
          }}
          isOpen={this.state.showModalEnv}
          onlyConfirmButton
          onConfirm={() => this.setState({ showModalEnv: false })}
          popUpWarningType="warning"
        />
      </Wrapper>
    );
  }
}

PluginCard.defaultProps = {
  isAlreadyInstalled: false,
  plugin: {
    description: '',
    id: '',
    name: '',
    price: 0,
    ratings: 5,
  },
};

PluginCard.propTypes = {
  currentEnvironment: PropTypes.string.isRequired,
  downloadPlugin: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  isAlreadyInstalled: PropTypes.bool,
  plugin: PropTypes.object,
};

export default PluginCard;
