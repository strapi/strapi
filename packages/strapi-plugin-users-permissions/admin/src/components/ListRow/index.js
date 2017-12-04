/**
*
* ListRow
*
*/

import React from 'react';
import cn from 'classnames';
import PropTypes from 'prop-types';
import { get, includes } from 'lodash';
import { router } from 'app';

// Design
import IcoContainer from 'components/IcoContainer';
import PopUpWarning from 'components/PopUpWarning';

import styles from './styles.scss';

class ListRow extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { showModalDelete: false };

  componentWillReceiveProps(nextProps) {
    if (nextProps.deleteActionSucceeded !== this.props.deleteActionSucceeded) {
      this.setState({ showModalDelete: false });
    }
  }

  // Roles that can't be deleted && modified
  // Don't delete this line
  protectedRoleIDs = ['0'];

  // Roles that can't be deleted;
  undeletableIDs = ['1'];

  generateContent = () => {
    let icons = [
      {
        icoType: 'pencil',
        onClick: this.handleClick,
      },
      {
        icoType: 'trash',
        onClick: () => { this.setState({ showModalDelete: true }); },
      },
    ];

    switch (this.props.settingType) {
      case 'roles':
        if (includes(this.protectedRoleIDs, get(this.props.item, 'id').toString())) {
          icons = [];
        }

        if (includes(this.undeletableIDs, get(this.props.item, 'id').toString())) {
          icons = [{ icoType: 'pencil', onClick: this.handleClick }];
        }

        return (
          <div className={cn('row', styles.wrapper)}>
            <div className="col-md-2">
              <b>{this.props.item.name}</b>
            </div>
            <div className="col-md-7">
              {this.props.item.description}
            </div>
            <div className="col-md-1">
              <strong>{this.props.item.nb_users || 0}</strong>&nbsp;
              {this.props.item.nb_users > 1 ? (
                'users'
              ) : (
                'user'
              )}
            </div>
            <div className="col-md-2">
              <IcoContainer icons={icons} />
            </div>
          </div>
        );
      case 'providers':
        return (
          <div className={cn('row', styles.wrapper)}>
            <div className="col-md-4">
              <div className={styles.flex}>
                <div>
                  <i className={`fa fa-${this.props.item.ico}`} />
                </div>
                <div>
                  {this.props.item.name}
                </div>
              </div>
            </div>
            <div className="col-md-6" style={{ fontWeight: '500' }}>
              {this.props.item.enabled ? (
                <span style={{ color: '#5A9E06' }}>Enabled</span>
              ) : (
                <span style={{ color: '#F64D0A' }}>Disabled</span>
              )}
            </div>
            <div className="col-md-2">
              <IcoContainer icons={icons} />
            </div>
          </div>
        );

      case 'email-templates':
        icons = [
          {
            icoType: 'pencil',
            onClick: this.handleClick,
          },
        ];

        return (
          <div className={cn('row', styles.wrapper)}>
            <div className="col-md-4">
              <div className={styles.flex}>
                <div>
                  <i className={`fa fa-${this.props.item.ico}`} />
                </div>
                <div>
                  {this.props.item.name}
                </div>
              </div>
            </div>
            <div className="col-md-8">
              <IcoContainer icons={icons} />
            </div>
          </div>
        );

      default:
        return '';
    }
  }

  handleClick = () => {
    switch (this.props.settingType) {
      case 'roles': {
        if (!includes(this.protectedRoleIDs, get(this.props.item, 'id').toString())) {
          return router.push(`${router.location.pathname}/edit/${this.props.item.id}`);
        }
        return;
      }
      case 'providers':
      case 'email-templates':
        return router.push(`${router.location.pathname}#edit::${this.props.settingType}::${this.props.item.id}`);
      default:
        return;
    }
  }

  handleDelete = () => this.props.deleteData(this.props.item, this.props.settingType);

  render() {
    return (
      <li className={styles.li} onClick={this.handleClick}>
        <div className={styles.container}>
          {this.generateContent()}
        </div>
        <PopUpWarning
          isOpen={this.state.showModalDelete}
          onConfirm={this.handleDelete}
          toggleModal={() => this.setState({ showModalDelete: false })}
        />
      </li>
    );
  }
}

ListRow.defaultProps = {
  item: {
    name: 'Owner',
    description: 'Rule them all. This role can\'t be deleted',
    nb_users: 1,
  },
  settingType: 'roles',
};

ListRow.propTypes = {
  deleteActionSucceeded: PropTypes.bool.isRequired,
  deleteData: PropTypes.func.isRequired,
  item: PropTypes.object,
  settingType: PropTypes.string,
};

export default ListRow;
