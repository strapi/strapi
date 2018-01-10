/*
*
* Row
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { FormattedMessage } from 'react-intl';

// Design
import Ico from 'components/Ico';
import ListRow from 'components/ListRow';
import PopUpWarning from 'components/PopUpWarning';
import IconAuth from 'assets/icons/icon_auth-permissions.svg';
import IconCtb from 'assets/icons/icon_content-type-builder.svg';
import IconCm from 'assets/icons/icon_content-manager.svg';
import IconSettings from 'assets/icons/icon_settings-manager.svg';

import styles from './styles.scss';

class Row extends React.Component {
  state = { showModal: false };

  componentWillReceiveProps(nextProps) {
    if (nextProps.pluginActionSucceeded !== this.props.pluginActionSucceeded) {
      this.setState({ showModal: false });
    }
  }

  handleClick = (e) => {
    this.setState({ showModal: !this.state.showModal });
    this.props.onDeleteClick(e);
  }

  renderImg = () => {
    switch (this.props.plugin.name) {
      case 'Auth & Permissions':
        return <img src={IconAuth} alt="logo" />;
      case 'Content Manager':
        return <img src={IconCm} alt="logo" />;
      case 'Settings Manager':
        return <img src={IconSettings} alt="logo" />;
      case 'Content Type Builder':
        return <img src={IconCtb} alt="logo" />;
      default:
    }
  }

  render() {
    const pluginIcon = this.props.plugin.name !== 'Email' ? (
      <div className={styles.frame} style={{ marginRight: '30px' }}>
        <span className={styles.helper} />{this.renderImg()}
      </div>
    ) : (
      <div className={styles.icoContainer} style={{ marginRight: '30px' }}>
        <i className={`fa fa-${this.props.plugin.icon}`} />
      </div>
    );

    return (
      <ListRow>
        <div className={cn("col-md-11", styles.nameWrapper)}>
          {pluginIcon}
          <div className={styles.pluginContent}>
            <span>{this.props.plugin.name} —&nbsp;</span>
            <FormattedMessage id={this.props.plugin.description} />
          </div>
        </div>
        <div className="col-md-1">
          <div className={styles.actionContainer}>
            <Ico onClick={this.handleClick} id={this.props.name} />
          </div>
        </div>
        <PopUpWarning
          isOpen={this.state.showModal}
          toggleModal={() => this.setState({ showModal: !this.state.showModal })}
          popUpWarningType="danger"
          onConfirm={this.props.onDeleteConfirm}
        />
      </ListRow>
    );
  }
}

Row.propTypes = {
  name: PropTypes.string.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  onDeleteConfirm: PropTypes.func.isRequired,
  plugin: PropTypes.object.isRequired,
  pluginActionSucceeded: PropTypes.bool.isRequired,
};

export default Row;
