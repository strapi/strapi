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
    padding: 0 ${sizes.margin * 3}px;
    display: flex;
    height: 72px;
    &:not(:last-of-type) {
      justify-content: flex-end;
    }
    &:last-of-type {
      background-color: ${colors.beige};
      justify-content: space-between;
    }
    button {
      margin: auto 0;
    }
  }
`;

export default FooterModal;
