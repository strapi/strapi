/**
*
* List
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';

import Button from 'components/Button';
import styles from './styles.scss';

class List extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const title = this.props.renderCustomListTitle ?
      this.props.renderCustomListTitle(this.props, styles)
      : this.props.listContent.title;

    return (
      <div className={styles.list}>
        <div className={styles.flex}>
          {title}
          <div className={styles.buttonContainer}>
            <Button
              onClick={this.props.handleButtonClick}
              secondaryHotlineAdd
              label={'content-type-builder.button.attributes.add'}
            />
          </div>
        </div>
        <div className={styles.ulContainer}>
          <ul>
            {map(this.props.listContent[this.props.listContentMappingKey], (row, key) => {
              if (this.props.renderCustomLi) return this.props.renderCustomLi(row, key);

              return (
                <li key={key}>
                  {row.name}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }
}

List.propTypes = {
  handleButtonClick: PropTypes.func,
  listContent: PropTypes.object,
  listContentMappingKey: PropTypes.string.isRequired,
  renderCustomLi: PropTypes.func,
  renderCustomListTitle: PropTypes.func,
}

export default List;
