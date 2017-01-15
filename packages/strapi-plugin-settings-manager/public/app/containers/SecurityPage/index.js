/*
 * SecurityPage
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

export class SecurityPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const { formatMessage } = this.props.intl;

    return (
      <div className={styles.securityPage}>
        <Helmet
          title="Settings Manager - Security"
          meta={[
            { name: 'description', content: formatMessage(messages.rightSectionDescription) },
          ]}
        />
        <div className="container">
          <PluginHeader />
          <Container>
            <RightContentTitle
              title={formatMessage(appMessages.securitySectionTitle)}
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

SecurityPage.propTypes = {
  intl: intlShape.isRequired,
};

export default injectIntl(SecurityPage);
