/**
 *
 * FooterModal
 *
 */

import styled from 'styled-components';

// Prepare for theming
const sizes = {
  modal: {
    footer: {
      height: '6rem',
    },
  },
  margin: 10,
};

const colors = {
  beige: '#eff3f6',
};

const FooterModal = styled.div`
  section {
    padding: 0 ${sizes.margin * 3}px;
    display: flex;
    height: 72px;
    &:not(last-of-type) {
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
