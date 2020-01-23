/*
 *
 * Row
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { isEmpty } from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Design
import {
  GlobalContext,
  IcoContainer,
  ListRow,
  PopUpWarning,
} from 'strapi-helper-plugin';
import Action from './Action';
import Content from './Content';

const PLUGINS_WITH_CONFIG = ['email', 'upload'];

/* eslint-disable */

class Row extends React.Component {
  static contextType = GlobalContext;
  state = { showModal: false };

  componentDidUpdate(prevProps) {
    if (prevProps.pluginActionSucceeded !== this.props.pluginActionSucceeded) {
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

    const settingsPath = `/plugins/${name}/configurations/${currentEnvironment}`;
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
        <Content className="col-md-11">
          <div className="icoContainer" style={{ marginRight: '14px' }}>
            {!isEmpty(this.props.plugin.logo) && (
              <img src={`${this.props.plugin.logo}`} alt="icon" />
            )}
            {isEmpty(this.props.plugin.logo) && (
              <div className="icoWrapper">
                <FontAwesomeIcon icon={this.props.plugin.icon} />
              </div>
            )}
          </div>
          <div className="pluginContent">
            <span>{this.props.plugin.name} —&nbsp;</span>
            <FormattedMessage
              id={`${this.props.plugin.description}.short`}
              defaultMessage={this.props.plugin.description}
            />
          </div>
        </Content>
        <div className="col-md-1">
          <Action>
            <IcoContainer icons={icons} />
          </Action>
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

Row.propTypes = {
  history: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  onDeleteConfirm: PropTypes.func.isRequired,
  plugin: PropTypes.object.isRequired,
  pluginActionSucceeded: PropTypes.bool.isRequired,
};

export default withRouter(Row);
