/*
 *
 * AdvancedPage
 *
 */

import React from 'react';
import Helmet from 'react-helmet';
import PluginHeader from 'components/PluginHeader';
import Container from 'components/Container';
import RightContentTitle from 'components/RightContentTitle';
import RightContentSectionTitle from 'components/RightContentSectionTitle';
import { injectIntl, intlShape } from 'react-intl';
import appMessages from 'containers/App/messages.json';
import messages from './messages.json';
import { define } from '../../i18n';
define(messages);

import styles from './styles.scss';

export class AdvancedPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const { formatMessage } = this.props.intl;

    return (
      <div className={styles.advancedPage}>
        <Helmet
          title="Settings Manager - Advanced"
          meta={[
            { name: 'description', content: formatMessage(messages.rightSectionDescription) },
          ]}
        />
        <div className="container">
          <PluginHeader />
          <Container>
            <RightContentTitle
              title={formatMessage(appMessages.advancedSectionTitle)}
              description={formatMessage(messages.rightSectionDescription)}
            />
            <RightContentSectionTitle
              title={formatMessage(appMessages.comingSoon)}
              description=""
            />
          </Container>
        </div>
      </div>
    );
  }
}

AdvancedPage.propTypes = {
  intl: intlShape.isRequired,
};

export default injectIntl(AdvancedPage);
