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

  render() {
    return (
      <ListRow>
        <div className={cn("col-md-11", styles.nameWrapper)}>
          <div className={styles.icoContainer} style={{ marginRight: '14px' }}>
            <img src={`${this.props.plugin.logo}`} alt="icon" />
          </div>
          <div className={styles.pluginContent}>
            <span>{this.props.plugin.name} —&nbsp;</span>
            <FormattedMessage id={`${this.props.plugin.description}.short`} />
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
