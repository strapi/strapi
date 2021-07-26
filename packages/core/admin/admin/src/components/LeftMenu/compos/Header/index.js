import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { MenuLogoContext } from '../../../../contexts';
import Wrapper from './Wrapper';

const LeftMenuHeader = () => {
  const { logo } = useContext(MenuLogoContext);

  return (
    <Wrapper logo={logo}>
      <Link to="/" className="leftMenuHeaderLink">
        <span className="projectName" />
      </Link>
    </Wrapper>
  );
};

export default LeftMenuHeader;
