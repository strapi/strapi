import styled from 'styled-components';
import colors from '../../assets/styles/colors';
import sizes from '../../assets/styles/sizes';

const HeaderNavWrapper = styled.section`
  display: flex;
  padding: 0 ${sizes.margin * 3}px;
  position: relative;
  justify-content: space-between;
  height: 65px;
  font-size: 1.8rem;
  > hr {
    position: absolute;
    left: ${sizes.margin * 3}px;
    bottom: 0;
    width: calc(100% - ${sizes.margin * 6}px);
    height: 1px;
    background: ${colors.brightGrey};
    border: 0;
    margin: 0;
  }
  span {
    padding-top: 16px;
  }
  .settings-tabs {
    position: absolute;
    right: ${sizes.margin * 3}px;
    bottom: -${sizes.margin * 0.1}px;
  }
`;

export default HeaderNavWrapper;
