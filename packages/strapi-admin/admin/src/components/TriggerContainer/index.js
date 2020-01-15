import React from 'react';
import PropTypes from 'prop-types';
import { Fail, Success, Pending, Remove } from '@buffetjs/icons';
import { useGlobalContext } from 'strapi-helper-plugin';

import Wrapper from './Wrapper';

const TriggerContainer = ({ isPending, onCancel, response }) => {
  const { formatMessage } = useGlobalContext();
  const { statusCode, message } = response;

  return (
    <Wrapper>
      <table>
        <tbody>
          <tr>
            <td>
              <p>
                {formatMessage({
                  id: `Settings.webhooks.trigger.test`,
                })}
              </p>
            </td>
            {isPending && (
              <>
                <td>
                  <p>
                    <Pending fill="#ffb500" width="15px" height="15px" />
                    <span>
                      {formatMessage({
                        id: `Settings.webhooks.trigger.pending`,
                      })}
                    </span>
                  </p>
                </td>
                <td>
                  <button onClick={onCancel} type="button">
                    {formatMessage({ id: `Settings.webhooks.trigger.cancel` })}
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
                    <span>
                      {formatMessage({
                        id: `Settings.webhooks.trigger.success`,
                      })}
                    </span>
                  </p>
                </td>
                <td>
                  <p>
                    {formatMessage({
                      id: `Settings.webhooks.trigger.success.label`,
                    })}
                  </p>
                </td>
              </>
            )}

            {!isPending && statusCode >= 300 && (
              <>
                <td>
                  <p className="fail-label">
                    <Fail fill="#f64d0a" width="15px" height="15px" />
                    <span>
                      {formatMessage({
                        id: `Settings.error`,
                      })}{' '}
                      {statusCode}
                    </span>
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
