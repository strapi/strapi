import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';

import Dropdown from './Dropdown';
import LeftMenuLink from '../LeftMenuLink';

const LeftMenuSubList = ({ name, links, isSearching, isFirstItem }) => {
  const [collapse, setCollapse] = useState(isSearching || isFirstItem);
  const [filtered, setFiltered] = useState(collapse);

  const toggle = () => {
    setCollapse(!collapse);
  };

  useEffect(() => {
    setFiltered(collapse);
  }, [collapse]);

  return (
    links.length > 0 && (
      <Dropdown>
        <button onClick={toggle} className={filtered ? 'is-open' : ''}>
          {name}
        </button>
        <Collapse isOpen={filtered || isSearching}>
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
