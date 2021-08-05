import React from 'react';
import { Link } from 'react-router-dom';
import { useConfigurations } from '../../../../hooks';
import Wrapper from './Wrapper';

const LeftMenuHeader = () => {
  const { menuLogo } = useConfigurations();

  return (
    <Wrapper logo={menuLogo}>
      <Link to="/" className="leftMenuHeaderLink">
        <span className="projectName" />
      </Link>
    </Wrapper>
  );
};

export default LeftMenuHeader;
