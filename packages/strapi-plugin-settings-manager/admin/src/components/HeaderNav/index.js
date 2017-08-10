/**
*
* HeaderNav
*
*/

import React from 'react';
import { Link } from 'react-router';
import { join, map, take } from 'lodash';
import EditForm from 'components/EditForm';
import List from 'components/List';
import styles from './styles.scss';

class HeaderNav extends React.Component { // eslint-disable-line react/prefer-stateless-function
  subtractLight = (color, amount) => {
    const cc = parseInt(color,16) - amount;
    let c = (cc < 0) ? 0 : (cc);
    c = (c.toString(16).length > 1 ) ? c.toString(16) : `0${c.toString(16)}`;
    return c;
  }

  /* eslint-disable no-param-reassign */
  dark = (color, amount) => {
    color = (color.indexOf("#")>=0) ? color.substring(1,color.length) : color;
    amount = parseInt((255*amount)/100, 10);
    color = `#${this.subtractLight(color.substring(0,2), amount)}${this.subtractLight(color.substring(2,4), amount)}${this.subtractLight(color.substring(4,6), amount)}`;
    return color;
  }

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
                  linkColor = this.dark(linkColor, 5);
                  return (
                    <Link key={key} className={styles.headerLink} style={{ backgroundColor: linkColor}} to={`${baseUrl}/${link.name}`} activeClassName={styles.linkActive}>
                      <div></div>
                      <div className={`${styles.linkText} text-center`}>
                        {link.name}
                        {notifActive}
                      </div>
                    </Link>
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
  links: React.PropTypes.array,
  path: React.PropTypes.string,
  renderListComponent: React.PropTypes.bool,
}
export default HeaderNav;
