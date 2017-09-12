/**
*
* List
*
*/

import React from 'react';
import { map } from 'lodash';
import ButtonPrimaryHotline from 'components/Button';
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
            <ButtonPrimaryHotline
              buttonBackground={'secondaryAddType'}
              label={'content-type-builder.button.attributes.add'}
              handlei18n
              addShape
              onClick={this.props.handleButtonClick}
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
  handleButtonClick: React.PropTypes.func,
  listContent: React.PropTypes.object,
  listContentMappingKey: React.PropTypes.string.isRequired,
  renderCustomLi: React.PropTypes.func,
  renderCustomListTitle: React.PropTypes.func,
}

export default List;
