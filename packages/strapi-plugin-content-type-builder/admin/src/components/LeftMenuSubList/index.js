import React, { useEffect, useState } from 'react';

import { Collapse } from 'reactstrap';

import Dropdown from './Dropdown';
import LeftMenuLink from '../../components/LeftMenuLink';

const LeftMenuSubList = ({ name, links, isFiltered, isFirstItem }) => {
  const [collapse, setCollapse] = useState(isFiltered || isFirstItem);
  const [filtered, setFiltered] = useState(collapse);

  const toggle = () => {
    setCollapse(!collapse);
  };

  useEffect(() => {
    setFiltered(collapse);
  }, [collapse]);

  useEffect(() => {
    if (isFiltered === true) {
      setFiltered(isFiltered);
    } else {
      setFiltered(collapse);
    }
  }, [isFiltered, collapse]);

  return (
    links.length > 0 && (
      <Dropdown>
        <button onClick={toggle} className={filtered ? 'is-open' : ''}>
          {name}
        </button>
        <Collapse isOpen={filtered}>
          <ul>
            {links.map(link => {
              const { name, to } = link;
              return (
                <li key={name}>
                  <LeftMenuLink name={name} to={to} />
                </li>
              );
            })}
          </ul>
        </Collapse>
      </Dropdown>
    )
  );
};

export default LeftMenuSubList;
