/**
*
* HeaderNav
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { join, map, take } from 'lodash';
import EditForm from 'components/EditForm';
import List from 'components/List';
import { darken } from '../../utils/colors';
import styles from './styles.scss';

/* eslint-disable react/require-default-props  */
class HeaderNav extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const baseUrl = join(take(this.props.path.split('/'), 4), '/');
    const component = this.props.renderListComponent ? <List {...this.props} /> : <EditForm {...this.props} />;
    let linkColor = '#F5F5F5';

    return (
      <div className={styles.headerNav}>
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className={styles.headerContainer}>
                {map(this.props.links, (link, key) => {
                  const notifActive = link.active ? <div className={styles.notifPoint} /> : '';
                  linkColor = darken(linkColor, 2);

                  return (
                    <NavLink key={key} className={styles.headerLink} style={{ backgroundColor: linkColor}} to={`${baseUrl}/${link.name}`} activeClassName={styles.linkActive}>
                      <div className={`${styles.linkText} text-center`}>
                        {link.name}
                        {notifActive}
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {component}
      </div>
    );
  }
}

HeaderNav.propTypes = {
  links: PropTypes.array,
  path: PropTypes.string,
  renderListComponent: PropTypes.bool,
};

export default HeaderNav;
