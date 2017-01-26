/*
 *
 * Single
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import selectSingle from './selectors';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import styles from './styles.scss';

export class Single extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.single}>
      <Helmet
        title="Single"
        meta={[
          { name: 'description', content: 'Description of Single' },
        ]}
      />
        <FormattedMessage {...messages.header} />
      </div>
    );
  }
}

const mapStateToProps = selectSingle();

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Single);
