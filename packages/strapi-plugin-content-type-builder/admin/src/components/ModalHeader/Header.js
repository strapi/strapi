import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import UpperFirst from '../UpperFirst';
import ComponentInfos from './ComponentInfos';
import IconWrapper from './IconWrapper';

const Header = ({
  category,
  name,
  subCategory,
  target,
  targetUid,
  subTargetUid,
}) => {
  const shouldDisplayComponentCatInfos = target === 'components';

  const content = (
    <>
      <span>
        <UpperFirst content={category} />
      </span>
      <IconWrapper>
        <FontAwesomeIcon icon="chevron-right" />
      </IconWrapper>
      {subCategory && (
        <>
          <span>
            <UpperFirst content={subCategory} />
          </span>
          <ComponentInfos uid={subTargetUid} />
          <IconWrapper>
            <FontAwesomeIcon icon="chevron-right" />
          </IconWrapper>
        </>
      )}
    </>
  );

  return (
    <>
      {category && content}
      <span>
        <UpperFirst content={name} />
      </span>
      {shouldDisplayComponentCatInfos && <ComponentInfos uid={targetUid} />}
    </>
  );
};

Header.defaultProps = {
  category: null,
  name: null,
  subCategory: null,
  subTargetUid: null,
  target: null,
  targetUid: null,
};

Header.propTypes = {
  category: PropTypes.string,
  name: PropTypes.string,
  subCategory: PropTypes.string,
  subTargetUid: PropTypes.string,
  target: PropTypes.string,
  targetUid: PropTypes.string,
};

export default Header;
