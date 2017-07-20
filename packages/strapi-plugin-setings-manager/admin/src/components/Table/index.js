/**
*
* Table
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { map, find, get, isObject } from 'lodash';
import Button from 'components/Button';
import styles from './styles.scss';

class Table extends React.Component { // eslint-disable-line react/prefer-stateless-function

  renderRow = (props, key ) => {
    let contentDisplay;
    let deleteIcon = <i className="fa fa-trash" />;
    let dataDisplay = '';

    if (this.props.slug === 'languages') {
      contentDisplay = props.active ? 'Default Language' : 'Set to default';
      deleteIcon = props.active ? '' : deleteIcon;
      const dataValue = find(get(this.props.allLanguages, ['sections', '0', 'items', '0', 'items']), ['value', props.name]);
      dataDisplay = isObject(dataValue) ? <FormattedMessage {...{id: dataValue.name }} /> : '';
    }

    return (
      <tr key={key}>
        <th>{key}</th>
        <td>{dataDisplay}</td>
        <td>{props.name}</td>
        <td>{contentDisplay}</td>
        <td>{deleteIcon}</td>
      </tr>
    );
  }

  render() {
    const availableContentNumber = this.props.sections.length;
    const title = availableContentNumber > 1 ? `table.${this.props.slug}.title.plural` : `table.${this.props.slug}.title.singular`;
    const buttonLabel = `table.${this.props.slug}.button.label`;
    const titleDisplay = title ? <FormattedMessage {...{id: title}} /> : '';

    return (
      <div className={styles.tableContainer}>
        <div className={styles.tableComponent}>
          <div className="container-fluid">
            <div className="row">
              <div className={styles.flex}>
                <div className={styles.titleContainer}>
                  {availableContentNumber}&nbsp;{titleDisplay}
                </div>
                <div className={styles.buttonContainer}>
                  <Button  buttonBackground={'secondaryAddType'} label={buttonLabel} i18n addShape />
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-md-12">
                <table className={` table ${styles.tableNoBorder}`}>
                  <tbody>
                    {map(this.props.sections, (value, key) => (
                      this.renderRow(value,key)
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.flex}>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }
}

Table.propTypes = {
  allLanguages: React.PropTypes.object,
  sections: React.PropTypes.array,
  slug: React.PropTypes.string.isRequired,
};

export default Table;
