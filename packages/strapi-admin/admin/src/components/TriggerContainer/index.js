import React from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext } from 'strapi-helper-plugin';

import Wrapper from './Wrapper';

const TriggerContainer = ({ isPending, onCancel, response }) => {
  const { formatMessage } = useGlobalContext();
  const { error } = response;

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
                <td>Pending...</td>
                <td>
                  <button onClick={onCancel}>
                    {formatMessage({ id: `Settings.webhooks.trigger.cancel` })}
                  </button>
                </td>
              </>
            ) : (
              <>
                {!error ? (
                  <>
                    <td>Success!</td>
                    <td>Trigger succeded</td>
                  </>
                ) : (
                  <>
                    <td>Error 403</td>
                    <td title={{ error }}>{error}</td>
                  </>
                )}
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
