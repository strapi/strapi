/**
*
* List
* params:
*  -handlei18n: bool
*   used for the buttonComponent to render label with FormattedMessage
*  - listButtonLabel: string
*  - listTitle: string
*  - renderRow: function
*    overrides the default rendering of the List tr (we can pass customs components there)
*  - sections: array the elements to display
*
*/

import React from 'react';
import { map } from 'lodash';
import Button from 'components/Button';
import styles from './styles.scss';

class List extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.listContainer}>
        <div className={styles.listComponent}>
          <div className="container-fluid">
            <div className="row">
              <div className={styles.flex}>
                <div className={styles.titleContainer}>
                  {this.props.listTitle}
                </div>
                <div className={styles.buttonContainer}>
                  <Button  buttonBackground={'secondaryAddType'} label={this.props.listButtonLabel} handlei18n={this.props.handlei18n} addShape />
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-md-12">
                <table className={` table ${styles.listNoBorder}`}>
                  <tbody>
                    {map(this.props.sections, (value, key) => {
                      // handle custom row displaying
                      if (this.props.renderRow) {
                        return this.props.renderRow(value, key);
                      }
                      return (
                        <tr key={key}>
                          <th>{key}</th>
                          <td>{value.name}</td>
                        </tr>
                      );
                    })}
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

List.propTypes = {
  handlei18n: React.PropTypes.bool,
  listButtonLabel: React.PropTypes.string,
  listTitle: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.object,
  ]),
  renderRow: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.func,
  ]),
  sections: React.PropTypes.array,
};

export default List;
