/**
 * 
 * Content
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import IconRemove from '../../assets/images/icon_remove.svg';
import styles from '../SelectMany/styles.scss';

function Content({ index, item, onClick, onRemove }) {
  return (
    <React.Fragment>
      <div>
        <div className={styles.dragHandle}><span /></div>
        <FormattedMessage id="content-manager.containers.Edit.clickToJump">
          {title => (
            <span
              onClick={() => onClick(item)}
              title={title}
            >
              {item.label}
            </span>
          )}
        </FormattedMessage>
      </div>
      <div className={styles.selectManyDraggedItemActions}>
        <img src={IconRemove} alt="Remove Icon" onClick={() => onRemove(index)} />
      </div>
    </React.Fragment>
  );
}

Content.defaultProps = {
  index: 0,
  onClick: () => {},
  onRemove: () => {},
};

Content.propTypes = {
  index: PropTypes.number,
  item: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
};

export default Content;
