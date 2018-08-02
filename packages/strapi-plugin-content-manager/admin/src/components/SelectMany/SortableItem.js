/**
 *
 * SortableItem
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { SortableElement } from 'react-sortable-hoc';
// Icons.
import IconRemove from '../../assets/images/icon_remove.svg';
// CSS.
import styles from './styles.scss';

const SortableItem = SortableElement(({ item, onClick, onRemove, sortIndex }) => {
  return (
    <li className={styles.sortableListItem}>
      <div>
        <div className={styles.dragHandle}><span></span></div>
        <FormattedMessage id='content-manager.containers.Edit.clickToJump'>
          {title => (
            <span 
              className='sortable-item--value'
              onClick={() => onClick(item)} 
              title={title}
            >
              {item.label}
            </span>
          )}
        </FormattedMessage> 
       
      </div>
      <div className={styles.sortableListItemActions}>
        <img src={IconRemove} alt="Remove Icon" onClick={() => onRemove(sortIndex)} />
      </div>
    </li>
  );
});

SortableItem.propTypes = {
  item: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  sortIndex: PropTypes.number.isRequired,
};

export default SortableItem;