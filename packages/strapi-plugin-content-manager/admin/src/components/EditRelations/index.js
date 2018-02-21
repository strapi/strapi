/**
 *
 * EditRelations
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

function EditRelations() {
  return (
    <div className={styles.editFormRelations}>
      <FormattedMessage id="content-manager.EditRelations.title">
        {(message) => <h3>{message}</h3>}
      </FormattedMessage>
    </div>
  );
}

export default EditRelations;
