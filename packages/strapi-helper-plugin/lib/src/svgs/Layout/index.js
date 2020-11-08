import styled from 'styled-components';
import SvgCompo from './SvgCompo';

const Layout = styled(SvgCompo)`
  > g {
    fill: #4b515a;

    &:hover {
      fill: #007eff;
    }
  }
  &.colored {
    > g {
      fill: ${({ fill }) => fill};
    }
  }
`;

Layout.defaultProps = {
  fill: '#007eff',
};

export default Layout;
