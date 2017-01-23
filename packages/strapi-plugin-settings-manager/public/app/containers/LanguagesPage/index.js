/*
 * LanguagesPage
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

export class LanguagesPage extends React.Component { // eslint-disable-line react/prefer-stateless-function

  render() {
    const { formatMessage } = this.props.intl;

    return (
      <div className={styles.languagesPage}>
        <Helmet
          title="Settings Manager - Languages"
          meta={[
            { name: 'description', content: formatMessage(messages.rightSectionDescription) },
          ]}
        />
        <div className="container">
          <PluginHeader />
          <Container>
            <RightContentTitle
              title={formatMessage(appMessages.languagesSectionTitle)}
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

LanguagesPage.propTypes = {
  intl: intlShape.isRequired,
};

export default injectIntl(LanguagesPage);
