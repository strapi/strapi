/**
*
* ListRow
*
*/

import React from 'react';
import cn from 'classnames';
import PropTypes from 'prop-types';

// Design
import IcoContainer from 'components/IcoContainer';
import styles from './styles.scss';

class ListRow extends React.Component { // eslint-disable-line react/prefer-stateless-function
  generateContent = () => {
    let icons = [
      {
        icoType: 'pencil',
        onClick: () => { console.log('edit') },
      },
      {
        icoType: 'trash',
        onClick: () => { console.log('delete') },
      },
    ];

    switch (this.props.settingType) {
      case 'roles':
        return (
          <div className={cn('row', styles.wrapper)}>
            <div className="col-md-2">
              <b>{this.props.item.name}</b>
            </div>
            <div className="col-md-7">
              {this.props.item.description}
            </div>
            <div className="col-md-1">
              <b>{this.props.item.nb_users}</b>&nbsp;
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
            <div className="col-md-6" style={{ fontWeight: '600' }}>
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
            onClick: () => { console.log('edit') },
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

  render() {
    return (
      <li className={styles.li}>
        <div className={styles.container}>
          {this.generateContent()}
        </div>
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
}

ListRow.proptypes = {
  item: PropTypes.object,
  settingType: PropTypes.string,
};

export default ListRow;
