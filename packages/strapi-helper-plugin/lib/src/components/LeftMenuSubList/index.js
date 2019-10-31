import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';

import Dropdown from './Dropdown';
import LeftMenuLink from '../LeftMenuLink';

const LeftMenuSubList = ({ name, links, isSearching, isFirstItem }) => {
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
        <button onClick={toggle} className={collapse ? 'is-open' : ''}>
          {name}
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
  name: null,
  links: [],
  isSearching: false,
  isFirstItem: false,
};

LeftMenuSubList.propTypes = {
  name: PropTypes.string,
  links: PropTypes.array,
  isSearching: PropTypes.bool,
  isFirstItem: PropTypes.bool,
};

export default LeftMenuSubList;
