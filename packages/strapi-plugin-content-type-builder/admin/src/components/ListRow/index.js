import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { FormattedMessage } from 'react-intl';

import { PopUpWarning } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';

import StyledListRow from './StyledListRow';

import assets from './assets';

function ListRow({
  canOpenModal,
  deleteAttribute,
  isTemporary,
  name,
  onClickGoTo,
  source,
  uid,
  target,
  type,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const ico = ['integer', 'biginteger', 'float', 'decimal'].includes(type)
    ? 'number'
    : type;

  const src = target ? assets.relation : assets[ico];

  return (
    <>
      <StyledListRow
        onClick={e => {
          e.stopPropagation();

          const to = uid || name;
          onClickGoTo(to, source);
        }}
      >
        <td>
          <img src={src} alt={`icon-${ico}`} />
        </td>
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
              <FormattedMessage
                id={`${pluginId}.contentType.temporaryDisplay`}
              />
            )}
          </p>
        </td>
        <td>
          <FormattedMessage id={`${pluginId}.attribute.${type}`} />
        </td>
        <td>
          {!source && (
            <>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();

                  const to = uid || name;
                  onClickGoTo(to, source, canOpenModal || isTemporary);
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

              <PopUpWarning
                isOpen={isOpen}
                toggleModal={() => setIsOpen(prevState => !prevState)}
                content={{
                  message: `${pluginId}.popUpWarning.bodyMessage.${
                    type === 'models' ? 'contentType' : 'groups'
                  }.delete`,
                }}
                type="danger"
                onConfirm={() => {
                  setIsOpen(false);
                  deleteAttribute(name);
                }}
              />
            </>
          )}
        </td>
      </StyledListRow>
    </>
  );
}

ListRow.defaultProps = {
  target: null,
  source: null,
  uid: null,
  deleteAttribute: () => {},
};

ListRow.propTypes = {
  canOpenModal: PropTypes.bool,
  context: PropTypes.object,
  deleteAttribute: PropTypes.func,
  isTemporary: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  onClickGoTo: PropTypes.func.isRequired,
  source: PropTypes.string,
  uid: PropTypes.string,
  type: PropTypes.string.isRequired,
};

export default ListRow;
