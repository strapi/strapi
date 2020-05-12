/**
 *
 * PluginCard
 *
 */
/* eslint-disable */
import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Button, PopUpWarning } from 'strapi-helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Wrapper from './Wrapper';

const PLUGINS_WITH_CONFIG = ['email', 'upload'];

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

  handleClick = () => {
    if (this.props.plugin.id !== 'support-us') {
      this.props.history.push({
        pathname: this.props.history.location.pathname,
        hash: `${this.props.plugin.id}::description`,
      });
    } else {
      this.aTag.click();
    }
  };

  handleClickSettings = e => {
    const settingsPath = `/plugins/${this.props.plugin.id}/configurations/${this.props.currentEnvironment}`;

    e.preventDefault();
    e.stopPropagation();

    this.props.history.push(settingsPath);
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
    const buttonClass = !this.props.isAlreadyInstalled
      ? 'primary'
      : 'secondary';
    const buttonLabel = this.props.isAlreadyInstalled
      ? 'app.components.PluginCard.Button.label.install'
      : 'app.components.PluginCard.Button.label.download';

    // Display settings link for a selection of plugins.
    const settingsComponent = PLUGINS_WITH_CONFIG.includes(
      this.props.plugin.id
    ) && (
      <div className="settings" onClick={this.handleClickSettings}>
        <FontAwesomeIcon icon="cog" />
        <FormattedMessage id="app.components.PluginCard.settings" />
      </div>
    );

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
            id={
              this.props.plugin.description.long ||
              this.props.plugin.description.short
            }
          />
        ) : (
          this.props.plugin.description.long ||
          this.props.plugin.description.short
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
            <div>
              {this.props.plugin.name}{' '}
              <i
                className="fa fa-external-link-alt"
                onClick={() =>
                  window.open(
                    `https://github.com/strapi/strapi/tree/master/packages/strapi-plugin-${this.props.plugin.id}`,
                    '_blank'
                  )
                }
              />
            </div>
          </div>
          <div className="cardDescription">{descriptions.long}</div>
          <div className="cardFooter" onClick={e => e.stopPropagation()}>
            <div className="cardFooterButton">
              <Button
                className={`${buttonClass} button`}
                label={buttonLabel}
                type="button"
                onClick={this.handleDownloadPlugin}
              />
              <a
                href="https://strapi.io/shop"
                style={{ display: 'none' }}
                ref={a => {
                  this.aTag = a;
                }}
                target="_blank"
              >
                &nbsp;
              </a>
            </div>
            {this.props.isAlreadyInstalled ? (
              settingsComponent
            ) : (
              <div className="compatible">
                <i
                  className={`fa fa-${
                    this.props.plugin.isCompatible ? 'check' : 'times'
                  }`}
                />
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
            message:
              'app.components.PluginCard.PopUpWarning.install.impossible.autoReload.needed',
            title:
              'app.components.PluginCard.PopUpWarning.install.impossible.title',
            confirm:
              'app.components.PluginCard.PopUpWarning.install.impossible.confirm',
          }}
          isOpen={this.state.showModalAutoReload}
          onlyConfirmButton
          onConfirm={() => this.setState({ showModalAutoReload: false })}
          popUpWarningType="warning"
        />
        <PopUpWarning
          content={{
            message:
              'app.components.PluginCard.PopUpWarning.install.impossible.environment',
            title:
              'app.components.PluginCard.PopUpWarning.install.impossible.title',
            confirm:
              'app.components.PluginCard.PopUpWarning.install.impossible.confirm',
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
