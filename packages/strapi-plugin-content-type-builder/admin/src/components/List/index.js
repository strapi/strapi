/**
*
* List
*
*/

import React from 'react';
import { forEach, has, map, size } from 'lodash';
import { FormattedMessage } from 'react-intl';
import ButtonPrimaryHotline from 'components/Button';
import AttributeRow from 'components/AttributeRow';
import styles from './styles.scss';

class List extends React.Component { // eslint-disable-line react/prefer-stateless-function

  renderListTitle = () => {
    const availableNumber = size(this.props.model.attributes);
    const title = availableNumber > 1 ? 'modelPage.contentType.list.title.plural'
      : 'modelPage.contentType.list.title.singular';

    let relationShipNumber = 0;

    forEach(this.props.model.attributes, (attribute) => {
      if (has(attribute.params, 'model')) relationShipNumber += 1;
    });

    const relationShipTitle = relationShipNumber > 1 ? 'modelPage.contentType.list.relationShipTitle.plural'
      : 'modelPage.contentType.list.relationShipTitle.singular';

    let fullTitle;
    if (relationShipNumber > 0) {
      fullTitle = (
        <div className={styles.titleContainer}>
          {availableNumber} <FormattedMessage id={title} /> <FormattedMessage id={'modelPage.contentType.list.title.including'} /> {relationShipNumber} <FormattedMessage id={relationShipTitle} />
        </div>
      );
    } else {
      fullTitle = (
        <div className={styles.titleContainer}>
          {availableNumber} <FormattedMessage id={title} />

        </div>
      );
    }
    return fullTitle;
  }

  render() {
    return (
      <div className={styles.list}>
        <div className={styles.flex}>
          {this.renderListTitle()}
          <div className={styles.buttonContainer}>
            <ButtonPrimaryHotline
              buttonBackground={'secondaryAddType'}
              label={'button.attributes.add'}
              handlei18n
              addShape
              onClick={this.props.handleButtonClick}
            />
          </div>
        </div>
        <div className={styles.ulContainer}>
          <ul>
            {map(this.props.model.attributes, (attribute, key) => (
              <AttributeRow key={key} row={attribute} />
            ))}
          </ul>
        </div>
      </div>
    );
  }
}

List.propTypes = {
  handleButtonClick: React.PropTypes.func,
  model: React.PropTypes.object,
}

export default List;
