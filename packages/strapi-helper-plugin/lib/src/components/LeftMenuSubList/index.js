import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { isObject } from 'lodash';
import { Collapse } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useGlobalContext } from '../../contexts/GlobalContext';
import LeftMenuLink from '../LeftMenuLink';
import Dropdown from './Dropdown';

const LeftMenuSubList = ({ isEditable, isFirstItem, isSearching, links, name, onClickEdit }) => {
  const [collapse, setCollapse] = useState(isFirstItem);
  const { formatMessage } = useGlobalContext();

  const toggle = () => {
    setCollapse(!collapse);
  };

  const getLabel = message => {
    if (isObject(message) && message.id) {
      return formatMessage({
        ...message,
        defaultMessage: message.defaultMessage || message.id,
      });
    }

    return message;
  };

  useEffect(() => {
    if (isSearching) {
      setCollapse(true);
    } else {
      setCollapse(isFirstItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching]);

  return (
    links.length > 0 && (
      <Dropdown>
        <button onClick={toggle} className={`editable ${collapse ? 'is-open' : ''}`}>
          {name}
          {isEditable && (
            <FontAwesomeIcon
              icon="pencil-alt"
              onClick={e => {
                onClickEdit(e, { name, links, isFirstItem, isSearching });
              }}
            />
          )}
        </button>
        <Collapse isOpen={collapse}>
          <ul>
            {links.map(link => {
              const { name, title } = link;

              return (
                <li key={name}>
                  <LeftMenuLink {...link}>{getLabel(title)}</LeftMenuLink>
                </li>
              );
            })}
          </ul>
        </Collapse>
      </Dropdown>
    )
  );
};

LeftMenuSubList.defaultProps = {
  isEditable: false,
  isFirstItem: false,
  isSearching: false,
  links: [],
  name: null,
  onClickEdit: () => {},
};

LeftMenuSubList.propTypes = {
  isEditable: PropTypes.bool,
  isFirstItem: PropTypes.bool,
  isSearching: PropTypes.bool,
  links: PropTypes.array,
  name: PropTypes.string,
  onClickEdit: PropTypes.func,
};

export default LeftMenuSubList;
