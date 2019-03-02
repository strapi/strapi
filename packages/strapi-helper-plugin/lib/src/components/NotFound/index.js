import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Button from '../Button';

import styles from './styles.scss';

function NotFound({ history }) {
  return (
    <div className={styles.notFound}>
      <h1 className={styles.notFoundTitle}>
        404
      </h1>
      <h2 className={styles.notFoundDescription}>
        <FormattedMessage id="app.components.NotFoundPage.description" />
      </h2>
      <Button
        label="app.components.NotFoundPage.back"
        kind="back"
        onClick={(e) => {
          e.stopPropagation();

          history.goBack();
        }}
      />
    </div>
  );
}

NotFound.propTypes = {
  history: PropTypes.shape({
    goBack: PropTypes.func,
  }).isRequired,
};

export default NotFound;
