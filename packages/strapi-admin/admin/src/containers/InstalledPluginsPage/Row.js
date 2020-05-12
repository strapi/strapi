import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { IconLinks } from '@buffetjs/core';
import { useGlobalContext, PopUpWarning } from 'strapi-helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useHistory } from 'react-router-dom';
import { faTrash, faCog } from '@fortawesome/free-solid-svg-icons';
import Text from '../../components/Text';
import CustomRow from './CustomRow';
import LogoContainer from './Logo';

// TODO: remove the upload plugin when the media lib feature is merged.
const PLUGINS_WITH_CONFIG = ['email', 'upload'];

const Row = ({ logo, name, description, isRequired, id, icon, onConfirm }) => {
  const { currentEnvironment, formatMessage } = useGlobalContext();
  const [isOpen, setIsOpen] = useState(false);
  const { push } = useHistory();
  const links = [];

  if (PLUGINS_WITH_CONFIG.includes(id)) {
    links.push({
      icon: <FontAwesomeIcon icon={faCog} />,
      onClick: () => {
        const settingsPath = `/plugins/${id}/configurations/${currentEnvironment}`;

        push(settingsPath);
      },
    });
  }

  const handleClickConfirm = () => {
    handleToggle();
    onConfirm(id);
  };

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  if (!isRequired) {
    links.push({
      icon: <FontAwesomeIcon icon={faTrash} />,
      onClick: handleToggle,
    });
  }

  return (
    <CustomRow>
      <td style={{ paddingLeft: 30, paddingTop: 0, width: 100, verticalAlign: 'bottom' }}>
        <LogoContainer>
          {logo && <img src={logo} alt="icon" />}
          {!logo && (
            <div className="icon-wrapper">
              <FontAwesomeIcon icon={icon} />
            </div>
          )}
        </LogoContainer>
      </td>
      <td>
        <p>
          <Text
            as="span"
            fontSize="xs"
            fontWeight="bold"
            letterSpacing="0.7px"
            textTransform="uppercase"
          >
            {name}&nbsp;—&nbsp;
          </Text>
          <Text as="span" fontSize="md">
            {formatMessage({
              id: `${description}.short`,
              defaultMessage: description,
            })}
          </Text>
        </p>
      </td>

      <td>
        <IconLinks links={links} />
        <PopUpWarning
          isOpen={isOpen}
          toggleModal={handleToggle}
          popUpWarningType="danger"
          onConfirm={handleClickConfirm}
        />
      </td>
    </CustomRow>
  );
};

Row.defaultProps = {
  icon: 'plug',
  isRequired: false,
  logo: null,
  onConfirm: () => {},
};

Row.propTypes = {
  description: PropTypes.string.isRequired,
  icon: PropTypes.string,
  id: PropTypes.string.isRequired,
  isRequired: PropTypes.bool,
  logo: PropTypes.string,
  name: PropTypes.string.isRequired,
  onConfirm: PropTypes.func,
};

export default Row;
