/*
*
*
* ListPlugins
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { map, size } from 'lodash';
import cn from 'classnames';
import Button from 'components/Button';
import Ico from 'components/Ico';
import ListRow from 'components/ListRow';
import PopUpWarning from 'components/PopUpWarning';

import styles from './styles.scss';

class ListPlugins extends React.Component {
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

  handleDelete = () => {
    this.setState({ showModal: false });
  }

  render() {
    const listSize = size(this.props.plugins);
    let titleType = listSize === 1 ? 'singular' : 'plural';

    if (listSize === 0) {
      titleType = 'none';
    }

    return (
      <div className={styles.container}>
        <div className={styles.titleContainer}>
          <div>
            <FormattedMessage id={`app.components.listPlugins.title.${titleType}`} values={{ number: listSize}} />
          </div>
          <div>
            <Button
              label="app.components.listPlugins.button"
              onClick={() => this.props.history.push('/install-plugin')}
              secondaryHotlineAdd
              style={{ display: 'none'}}
            />
          </div>
        </div>
        <div className="container-fluid">
          <div className="row">
            <div className={styles.ulContainer}>
              <ul>
                {map(this.props.plugins, (plugin, key) => (
                  <ListRow key={plugin.name}>
                    <div className="col-md-1">
                      <div className={styles.icoContainer}>
                        <i className={`fa fa-${plugin.icon}`} />
                      </div>
                    </div>
                    <div className={cn(styles.pluginContent, 'col-md-10')}>
                      <span>{plugin.name} —&nbsp;</span>
                      <FormattedMessage id={plugin.description} />
                    </div>
                    <div className="col-md-1">
                      <div className={styles.actionContainer}>
                        <Ico onClick={this.handleClick} id={key} />
                      </div>
                    </div>
                    <PopUpWarning
                      isOpen={this.state.showModal}
                      toggleModal={() => this.setState({ showModal: !this.state.showModal })}
                      popUpWarningType="danger"
                      onConfirm={this.props.onDeleteConfirm}
                    />
                  </ListRow>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ListPlugins.propTypes = {
  history: PropTypes.object.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  onDeleteConfirm: PropTypes.func.isRequired,
  pluginActionSucceeded: PropTypes.bool.isRequired,
  plugins: PropTypes.object.isRequired,
};

export default ListPlugins;
