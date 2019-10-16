import React, { useState } from 'react';
import { Collapse } from 'reactstrap';

import Wrapper from './Wrapper';

const renderCompo = link => {
  const { links, name } = link;
  return links ? (
    <Dropdown {...link} key={name} />
  ) : (
    <LeftMenuLink {...link} key={name} />
  );
};

const LeftMenuLink = ({ name, to }) => {
  return (
    <a to={to}>
      <p>{name}</p>
    </a>
  );
};

const Dropdown = ({ name, links }) => {
  return (
    <div>
      <p>{name}</p>
      <ul>
        {links.map(link => {
          return (
            <li key={link.name}>
              <LeftMenuLink {...link} />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

function LeftMenuList({ name, links }) {
  const [search, setSearch] = useState('');
  const [collapse, setCollapse] = useState(true);

  const toggle = () => setCollapse(!collapse);

  return (
    <Wrapper className={!collapse ? 'list-collapsed' : ''}>
      <div className="list-header">
        <button onClick={toggle}>
          <h3>
            {name}&nbsp;&nbsp;<span>{links.length}</span>
          </h3>
        </button>
      </div>
      <Collapse isOpen={collapse}>
        <ul>{links.map(link => renderCompo(link))}</ul>
      </Collapse>
    </Wrapper>
  );
}

export default LeftMenuList;
