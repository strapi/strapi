import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Fail, Success, Pending, Remove } from '@buffetjs/icons';
import { Grid, GridItem } from '@strapi/parts';

const Status = ({ isPending, statusCode }) => {
  if (isPending) {
    return (
      <>
        <Pending fill="#ffb500" width="15px" height="15px" />
        <FormattedMessage id="Settings.webhooks.trigger.pending" defaultMessage="pending" />
      </>
    );
  }

  if (statusCode >= 200 && statusCode < 300) {
    return (
      <>
        <Success fill="#6DBB1A" width="19px" height="19px" />
        <FormattedMessage id="Settings.webhooks.trigger.success" defaultMessage="success" />
      </>
    );
  }

  if (statusCode >= 300) {
    return (
      <>
        <Fail fill="#f64d0a" width="15px" height="15px" />
        <FormattedMessage id="Settings.error" defaultMessage="error" />
        &nbsp;
        {statusCode}
      </>
    );
  }

  return null;
};
Status.propTypes = {
  isPending: PropTypes.bool.isRequired,
  statusCode: PropTypes.number,
};
Status.defaultProps = {
  statusCode: undefined,
};

const Message = ({ statusCode, message }) => {
  if (statusCode >= 200 && statusCode < 300) {
    return (
      <>
        <FormattedMessage id="Settings.webhooks.trigger.success.label" defaultMessage="success" />
      </>
    );
  }

  if (statusCode >= 300) {
    return <p title={message}>{message}</p>;
  }

  return null;
};
Message.propTypes = {
  statusCode: PropTypes.number,
  message: PropTypes.string.isRequired,
};
Message.defaultProps = {
  statusCode: undefined,
};

const CancelButton = ({ onCancel }) => (
  <button onClick={onCancel} type="button">
    <FormattedMessage id="Settings.webhooks.trigger.cancel" defaultMessage="cancel" />
    <Remove fill="#b4b6ba" />
  </button>
);
CancelButton.propTypes = { onCancel: PropTypes.func.isRequired };

const TriggerContainer = ({ isPending, onCancel, response }) => {
  const { statusCode, message } = response;

  return (
    <Grid gap={4}>
      <GridItem col={3}>
        <FormattedMessage id="Settings.webhooks.trigger.test" defaultMessage="test-trigger" />
      </GridItem>
      <GridItem col={3}>
        <Status isPending={isPending} statusCode={statusCode} />
      </GridItem>
      <GridItem col={6}>
        {!isPending ? (
          <Message statusCode={statusCode} message={message} />
        ) : (
          <CancelButton onCancel={onCancel} />
        )}
      </GridItem>
    </Grid>
  );
};

TriggerContainer.defaultProps = {
  isPending: false,
  onCancel: () => {},
  response: {},
};

TriggerContainer.propTypes = {
  isPending: PropTypes.bool,
  onCancel: PropTypes.func,
  response: PropTypes.object,
};

export default TriggerContainer;
