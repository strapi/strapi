import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { PopUpWarning } from 'strapi-helper-plugin';

import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import Tr from './Tr';

function Row({
  canOpenModal,
  context,
  description,
  deleteModel,
  deleteGroup,
  deleteTemporaryModel,
  deleteTemporaryGroup,
  isTemporary,
  name,
  onClickGoTo,
  source,
  uid,
  viewType,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Tr
      key={name}
      onClick={e => {
        e.stopPropagation();

        const to = uid || name;
        onClickGoTo(to, source);
      }}
    >
      <td>
        <p>
          {name}
          {source && (
            <FormattedMessage id={`${pluginId}.from`}>
              {message => (
                <span
                  style={{
                    fontStyle: 'italic',
                    color: '#787E8F',
                    fontWeight: '500',
                  }}
                >
                  &nbsp;({message}: {source})
                </span>
              )}
            </FormattedMessage>
          )}
          &nbsp; &nbsp; &nbsp;
          {isTemporary && (
            <FormattedMessage id={`${pluginId}.contentType.temporaryDisplay`} />
          )}
        </p>
      </td>
      <td>
        <p>{description}</p>
      </td>
      <td>
        {!source && (
          <>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();

                const to = uid || name;
                onClickGoTo(to, source, isTemporary);
              }}
            >
              <i className="fa fa-pencil link-icon" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();

                if (canOpenModal || isTemporary) {
                  setIsOpen(true);
                } else {
                  strapi.notification.info(
                    `${pluginId}.notification.info.work.notSaved`
                  );
                }
              }}
            >
              <i className="fa fa-trash link-icon" />
            </button>
          </>
        )}
        <PopUpWarning
          isOpen={isOpen}
          toggleModal={() => setIsOpen(prevState => !prevState)}
          content={{
            message: `${pluginId}.popUpWarning.bodyMessage.${
              viewType === 'models' ? 'contentType' : 'groups'
            }.delete`,
          }}
          type="danger"
          onConfirm={() => {
            if (isTemporary) {
              const action =
                viewType === 'models'
                  ? deleteTemporaryModel
                  : deleteTemporaryGroup;

              action();
            } else {
              const action = viewType === 'models' ? deleteModel : deleteGroup;
              const featureName = viewType === 'models' ? name : uid;

              action(featureName, context);
            }
            setIsOpen(false);
          }}
        />
      </td>
    </Tr>
  );
}

Row.defaultProps = {
  source: null,
  uid: null,
};

Row.propTypes = {
  canOpenModal: PropTypes.bool,
  context: PropTypes.object,
  deleteGroup: PropTypes.func.isRequired,
  deleteModel: PropTypes.func.isRequired,
  deleteTemporaryGroup: PropTypes.func.isRequired,
  deleteTemporaryModel: PropTypes.func.isRequired,
  description: PropTypes.string.isRequired,
  isTemporary: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  onClickGoTo: PropTypes.func.isRequired,
  source: PropTypes.string,
  uid: PropTypes.string,
  viewType: PropTypes.string.isRequired,
};

export default Row;
