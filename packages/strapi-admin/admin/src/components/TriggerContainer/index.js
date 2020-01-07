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
              <p>Test-trigger</p>
            </td>

            {isPending ? (
              <>
                <td>
                  <p>
                    <Pending fill="#6DBB1A" width="14px" height="15px" />
                    <span>Pending...</span>
                  </p>
                </td>
                <td>
                  <button onClick={onCancel} type="button">
                    {formatMessage({ id: `Settings.webhooks.trigger.cancel` })}
                    <Remove fill="#b4b6ba" />
                  </button>
                </td>
              </>
            ) : statusCode >= 200 && statusCode < 300 ? (
              <>
                <td>
                  <p className="success-label">
                    <Success fill="#6DBB1A" width="19px" height="19px" />
                    <span>Success!</span>
                  </p>
                </td>
                <td>
                  <p>Trigger succeded</p>
                </td>
              </>
            ) : (
              <>
                <td>
                  <p className="fail-label">
                    <Fail fill="#f64d0a" width="14px" height="15px" />
                    <span>Error {statusCode}</span>
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
};

TriggerContainer.propTypes = {
  isPending: PropTypes.bool,
  onCancel: PropTypes.func,
  response: PropTypes.object,
};

export default TriggerContainer;
