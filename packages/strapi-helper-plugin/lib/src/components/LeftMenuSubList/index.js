import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Dropdown from './Dropdown';
import LeftMenuLink from '../LeftMenuLink';

const LeftMenuSubList = ({
  isEditable,
  isFirstItem,
  isSearching,
  links,
  name,
  onClickEdit,
}) => {
  const [collapse, setCollapse] = useState(isFirstItem);

  const toggle = () => {
    setCollapse(!collapse);
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
        <button
          onClick={toggle}
          className={`editable ${collapse ? 'is-open' : ''}`}
        >
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
                  <LeftMenuLink {...link}>{title}</LeftMenuLink>
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
