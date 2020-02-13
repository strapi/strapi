/**
 *
 * FooterModal
 *
 */

import styled from 'styled-components';

import colors from '../../assets/styles/colors';
import sizes from '../../assets/styles/sizes';

const FooterModal = styled.div`
  padding-top: ${sizes.margin * 0.9}px;
  section {
    display: flex;
    height: 73px;
    padding: 0 ${sizes.margin * 3}px;
    justify-content: flex-end;
    &:last-of-type {
      justify-content: space-between;
      background-color: ${colors.beige};
    }
    button {
      margin: auto 0;
    }
  }
`;

export default FooterModal;
