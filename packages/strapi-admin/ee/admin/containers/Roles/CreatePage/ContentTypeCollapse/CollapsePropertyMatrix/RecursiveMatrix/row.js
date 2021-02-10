import styled from 'styled-components';
import { Flex, Text } from '@buffetjs/core';
import PropTypes from 'prop-types';
import Chevron from '../../../Chevron';

const activeStyle = theme => `
  color: ${theme.main.colors.mediumBlue};
  ${Text} {
    color: ${theme.main.colors.mediumBlue};
  }
  ${Chevron} {
    display: block;
    color: ${theme.main.colors.mediumBlue};
  }
`;

const RowStyle = styled.div`
  padding-left: ${({ theme }) => theme.main.sizes.paddings.xs};
  width: ${({ level }) => 128 - level * 18}px;
  ${Chevron} {
    width: 13px;
  }
  ${({ isCollapsable, theme }) =>
    isCollapsable &&
    `
    ${Chevron} {
      display: block;
      color: ${theme.main.colors.grey};
    }
    &:hover {
      ${activeStyle(theme)}
    }
  `}
  ${({ isActive, theme }) => isActive && activeStyle(theme)}}
`;

RowStyle.propTypes = {
  isActive: PropTypes.bool.isRequired,
  isCollapsable: PropTypes.bool.isRequired,
  level: PropTypes.number.isRequired,
};

const RowWrapper = styled(Flex)`
  height: ${({ isSmall }) => (isSmall ? '28px' : '36px')};
`;

export { RowStyle, RowWrapper };
