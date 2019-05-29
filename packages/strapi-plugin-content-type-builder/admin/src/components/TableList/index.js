/**
 *
 * TableList
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import { FormattedMessage } from 'react-intl';

import { Button } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import TableListRow from '../TableListRow';
import styles from './styles.scss';

class TableList extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  render() {
    const {
      canOpenModalAddContentType,
      deleteTemporaryModel,
      push,
    } = this.props;

    return (
      <div className={styles.tableListContainer}>
        <div className="container-fluid">
          <div className="row">
            <div className={styles.headerContainer}>
              <div className={styles.titleContainer}>
                {this.props.availableNumber}&nbsp;
                <FormattedMessage {...{ id: this.props.title }} />
              </div>
              <div className={styles.buttonContainer}>
                <Button
                  id="openAddCT"
                  secondaryHotlineAdd
                  label={this.props.buttonLabel}
                  onClick={this.props.onButtonClick}
                />
              </div>
            </div>
          </div>
          <div className="row">
            <div className={styles.ulContainer}>
              <ul id="ctbModelsList">
                <li>
                  <div className={`${styles.liHeaderContainer} row`}>
                    <div className="col-md-1" />
                    <div className="col-md-3">
                      <FormattedMessage
                        {...{ id: `${pluginId}.table.contentType.head.name` }}
                      />
                    </div>
                    <div className="col-md-5 text-center">
                      <FormattedMessage
                        {...{
                          id: `${pluginId}.table.contentType.head.description`,
                        }}
                      />
                    </div>
                    <div className="col-md-2 text-center">
                      <FormattedMessage
                        {...{ id: `${pluginId}.table.contentType.head.fields` }}
                      />
                    </div>
                    <div className="col-md-1" />
                  </div>
                </li>
                {map(this.props.rowItems, (rowItem, key) => (
                  <TableListRow
                    key={key}
                    canOpenModalAddContentType={canOpenModalAddContentType}
                    deleteTemporaryModel={deleteTemporaryModel}
                    onDelete={this.props.onDelete}
                    push={push}
                    rowItem={rowItem}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

TableList.defaultProps = {
  canOpenModalAddContentType: true,
};

TableList.propTypes = {
  availableNumber: PropTypes.number.isRequired,
  buttonLabel: PropTypes.string.isRequired,
  canOpenModalAddContentType: PropTypes.bool,
  deleteTemporaryModel: PropTypes.func.isRequired,
  onButtonClick: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  push: PropTypes.func.isRequired,
  rowItems: PropTypes.array.isRequired,
  title: PropTypes.string.isRequired,
};

export default TableList;
