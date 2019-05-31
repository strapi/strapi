/*
 *
 * Row
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { withRouter } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { includes, isEmpty } from 'lodash';

// Design
import { IcoContainer, ListRow, PopUpWarning } from 'strapi-helper-plugin';

import styles from './styles.scss';

const PLUGINS_WITH_CONFIG = ['content-manager', 'email', 'upload'];

class Row extends React.Component {
  state = { showModal: false };

  componentWillReceiveProps(nextProps) {
    if (nextProps.pluginActionSucceeded !== this.props.pluginActionSucceeded) {
      this.setState({ showModal: false });
    }
  }

  handleClick = e => {
    this.setState({ showModal: !this.state.showModal });
    this.props.onDeleteClick(e);
  };

  render() {
    // Make sure to match the ctm config URI instead of content-type view URI
    const {
      history: { push },
      name,
      plugin: { required },
    } = this.props;
    const { currentEnvironment } = this.context;

    const settingsPath =
      name === 'content-manager'
        ? '/plugins/content-manager/ctm-configurations'
        : `/plugins/${name}/configurations/${currentEnvironment}`;

    const icons = [];

    if (PLUGINS_WITH_CONFIG.includes(name)) {
      icons.push({
        icoType: 'cog',
        onClick: e => {
          e.preventDefault();
          e.stopPropagation();
          push(settingsPath);
        },
      });
    }

    if (!required && currentEnvironment === 'development') {
      icons.push({
        icoType: 'trash',
        id: name,
        onClick: this.handleClick,
      });
    }

    return (
      <ListRow>
        <div className={cn('col-md-11', styles.nameWrapper)}>
          <div className={styles.icoContainer} style={{ marginRight: '14px' }}>
            {!isEmpty(this.props.plugin.logo) && (
              <img src={`${this.props.plugin.logo}`} alt="icon" />
            )}
            {isEmpty(this.props.plugin.logo) && (
              <div className={styles.icoWrapper}>
                <i className={`fa fa-${this.props.plugin.icon}`} />
              </div>
            )}
          </div>
          <div className={styles.pluginContent}>
            <span>{this.props.plugin.name} —&nbsp;</span>
            <FormattedMessage
              id={`${this.props.plugin.description}.short`}
              defaultMessage={this.props.plugin.description}
            />
          </div>
        </div>
        <div className="col-md-1">
          <div className={styles.actionContainer}>
            <IcoContainer icons={icons} />
          </div>
        </div>
        <PopUpWarning
          isOpen={this.state.showModal}
          toggleModal={() =>
            this.setState({ showModal: !this.state.showModal })
          }
          popUpWarningType="danger"
          onConfirm={this.props.onDeleteConfirm}
        />
      </ListRow>
    );
  }
}

Row.contextTypes = {
  currentEnvironment: PropTypes.string,
};

Row.propTypes = {
  name: PropTypes.string.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  onDeleteConfirm: PropTypes.func.isRequired,
  plugin: PropTypes.object.isRequired,
  pluginActionSucceeded: PropTypes.bool.isRequired,
};

export default withRouter(Row);
