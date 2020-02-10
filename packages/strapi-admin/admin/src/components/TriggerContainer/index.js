import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Fail, Success, Pending, Remove } from '@buffetjs/icons';

import Wrapper from './Wrapper';

const TriggerContainer = ({ isPending, onCancel, response }) => {
  const { statusCode, message } = response;

  return (
    <Wrapper>
      <table>
        <tbody>
          <tr>
            <td>
              <p>
                <FormattedMessage
                  id="Settings.webhooks.trigger.test"
                  defaultMessage="test-trigger"
                />
              </p>
            </td>
            {isPending && (
              <>
                <td>
                  <p>
                    <Pending fill="#ffb500" width="15px" height="15px" />
                    <FormattedMessage
                      id="Settings.webhooks.trigger.pending"
                      defaultMessage="pending"
                    />
                  </p>
                </td>
                <td>
                  <button onClick={onCancel} type="button">
                    <FormattedMessage
                      id="Settings.webhooks.trigger.cancel"
                      defaultMessage="cancel"
                    />
                    <Remove fill="#b4b6ba" />
                  </button>
                </td>
              </>
            )}

            {!isPending && statusCode >= 200 && statusCode < 300 && (
              <>
                <td>
                  <p className="success-label">
                    <Success fill="#6DBB1A" width="19px" height="19px" />
                    <FormattedMessage
                      id="Settings.webhooks.trigger.success"
                      defaultMessage="success"
                    />
                  </p>
                </td>
                <td>
                  <p>
                    <FormattedMessage
                      id="Settings.webhooks.trigger.success.label"
                      defaultMessage="success"
                    />
                  </p>
                </td>
              </>
            )}

            {!isPending && statusCode >= 300 && (
              <>
                <td>
                  <p className="fail-label">
                    <Fail fill="#f64d0a" width="15px" height="15px" />
                    <FormattedMessage
                      id="Settings.error"
                      defaultMessage="error"
                    />
                    &nbsp;
                    {statusCode}
                  </p>
                </td>
                <td>
                  <p title={message}>{message}</p>
                </td>
              </>
            )}
          </tr>
        </tbody>
      </table>
    </Wrapper>
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
