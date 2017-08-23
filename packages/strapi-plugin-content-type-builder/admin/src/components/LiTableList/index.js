/**
*
* LiTableList
*
*/

import React from 'react';
import { startCase } from 'lodash';
import styles from 'components/TableList/styles.scss';
import { router } from 'app';
/* eslint-disable jsx-a11y/no-static-element-interactions */

class LiTableList extends React.Component { // eslint-disable-line react/prefer-stateless-function
  edit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('edit', this.props.rowItem.name);
  }

  delete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('delete', this.props.rowItem.name);
  }

  goTo = () => {
    router.push(`/plugins/content-type-builder/${this.props.rowItem.name}`);
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
              <div>
                <i className="fa fa-pencil" onClick={this.edit} role="button" />
              </div>
              <div>
                <i className="fa fa-trash" onClick={this.delete} role="button" />
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
