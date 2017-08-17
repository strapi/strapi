/**
*
* LiTableList
*
*/

import React from 'react';
import { includes, startCase } from 'lodash';
import styles from 'components/TableList/styles.scss';
import { router } from 'app';
/* eslint-disable jsx-a11y/no-static-element-interactions */

class LiTableList extends React.Component { // eslint-disable-line react/prefer-stateless-function
  edit = () => {
    console.log('edit', this.props.rowItem.name);
  }

  delete = () => {
    console.log('delete', this.props.rowItem.name);
  }

  goTo = (e) => {
    if (!includes(e.target.className, 'ico')) {
      router.push(`/plugins/content-type-builder/${this.props.rowItem.name}`);
    }
  }
  render() {
    return (
      <li>
        <div className={`${styles.liInnerContainer} row`} onClick={this.goTo} role="button">
          <div className="col-md-1"><i className={`fa ${this.props.rowItem.icon}`} /></div>
          <div className="col-md-2">{startCase(this.props.rowItem.name)}</div>
          <div className="col-md-5 text-center">{this.props.rowItem.description}</div>
          <div className="col-md-3 text-center">{this.props.rowItem.fields}</div>
          <div className="col-md-1">
            <div className={styles.icContainer}>
              <div className="ico">
                <i className="fa fa-pencil ico" onClick={this.edit} role="button" />
              </div>
              <div className="ico">
                <i className="fa fa-trash ico" onClick={this.delete} role="button" />
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  }
}

LiTableList.propTypes = {
  rowItem: React.PropTypes.object.isRequired,
};

export default LiTableList;
