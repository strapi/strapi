/**
*
* ListRow
*
*/

import React from 'react';
import cn from 'classnames';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, includes } from 'lodash';
import { router } from 'app';

// Design
import IcoContainer from 'components/IcoContainer';
import PopUpWarning from 'components/PopUpWarning';

import en from 'translations/en.json';
import styles from './styles.scss';

class ListRow extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { showModalDelete: false };

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
                  <i className={`fa fa-${this.props.item.icon}`} />
                </div>
                <div>
                  {this.props.item.display && en[this.props.item.display] ? (
                    <FormattedMessage id={`users-permissions.${this.props.item.display}`} />
                  ): this.props.item.name}
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
    // TODO open modal and pass data
    switch (this.props.settingType) {
      case 'roles': {
        if (!includes(this.protectedRoleIDs, get(this.props.item, 'id').toString())) {
          return router.push(`${router.location.pathname}/edit/${this.props.item.id}`);
        }
        return;
      }
      case 'providers':
      case 'email-templates':
        return this.context.setDataToEdit(this.props.item.name);
      default:
        return;
    }
  }

  handleDelete = () => {
    this.props.deleteData(this.props.item, this.props.settingType);
    this.setState({ showModalDelete: false });
  }

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

ListRow.contextTypes = {
  setDataToEdit: PropTypes.func.isRequired,
};

ListRow.defaultProps = {
  item: {
    name: 'Owner',
    description: 'Rule them all. This role can\'t be deleted',
    nb_users: 1,
    icon: 'envelope',
  },
  settingType: 'roles',
};

ListRow.propTypes = {
  deleteData: PropTypes.func.isRequired,
  item: PropTypes.object,
  settingType: PropTypes.string,
};

export default ListRow;
