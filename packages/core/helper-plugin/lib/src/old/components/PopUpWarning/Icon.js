import React, { memo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import IcoDanger from '../../assets/icons/icon_danger.svg';
import IcoNotFound from '../../assets/icons/icon_flag_not_found.svg';
import IcoInfo from '../../assets/icons/icon_info.svg';
import IcoSuccess from '../../assets/icons/icon_success.svg';
import IcoWarning from '../../assets/icons/icon_warning.svg';

const icons = {
  danger: IcoDanger,
  info: IcoInfo,
  notFound: IcoNotFound,
  success: IcoSuccess,
  warning: IcoWarning,
};

const Img = styled.img`
  width: 2.5rem;
  margin-bottom: 2.2rem;
`;

const Icon = ({ type }) => {
  return <Img src={icons[type]} alt="icon" />;
};

Icon.propTypes = {
  type: PropTypes.string.isRequired,
};

export default memo(Icon);
