import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

const Content = ({ description, elapsed, title }) => {
  let descriptionMsg = description;
  let titleMsg = title;
  let titleDefaultMsg = 'Waiting for restart';
  let descriptionDefaultMsg =
    "You're using a feature that needs the server to restart. Please wait until the server is up.";

  if (elapsed > 15) {
    description = 'components.OverlayBlocker.description.serverError';
    descriptionDefaultMsg =
      'The server should have restarted, please check your logs in the terminal.';
    title = 'components.OverlayBlocker.title.serverError';
    titleDefaultMsg = 'The restart is taking longer than expected';
  }

  return (
    <>
      <h4>
        <FormattedMessage id={titleMsg} defaultMessage={titleDefaultMsg} />
      </h4>
      <p>
        <FormattedMessage id={descriptionMsg} defaultMessage={descriptionDefaultMsg} />
      </p>
    </>
  );
};

Content.defaultProps = {
  description: 'components.OverlayBlocker.description',
  title: 'components.OverlayBlocker.title',
};

Content.propTypes = {
  description: PropTypes.string,
  elapsed: PropTypes.number.isRequired,
  title: PropTypes.string,
};

export default Content;
