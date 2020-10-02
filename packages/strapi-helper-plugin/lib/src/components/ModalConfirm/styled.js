import { Modal as BaseModal } from 'reactstrap';
import styled from 'styled-components';

const Body = styled.div`
  padding-top: 2.1rem;
  padding-bottom: 1.5rem
  padding-right: ${props => props.theme.main.sizes.paddings.md};
  padding-left: ${props => props.theme.main.sizes.paddings.md};
  text-align: center;
`;

const HeaderWrapper = styled.div`
  width: 100%;
  padding-left: ${props => props.theme.main.sizes.paddings.md};
  padding-right: ${props => props.theme.main.sizes.paddings.md};
  padding-top: 17px;
  padding-bottom: 22px;
  background-color: ${props => props.theme.main.colors.lightGrey};
  border: 0;
`;

const CloseButton = styled.div`
  position: absolute;
  top: 18px;
  right: 30px;
  cursor: pointer;
  > svg {
    fill: #c3c5c8;
  }
`;

const StyledModal = styled(BaseModal)`
  width: 41.6rem !important;
  margin: 14.4rem auto !important;
`;

const Footer = styled.div`
  display: flex;
  width: 100%;
  margin-top: 19px;
  justify-content: space-between;
  background-color: #eff3f6;
  padding: 15px 30px 17px 30px;
  > button {
    padding: 0 30px;
  }
`;

const Img = styled.img`
  width: 2.5rem;
  margin-bottom: 2.2rem;
`;

const TextWrapper = styled.div`
  min-height: 36px;
`;

export { Body, CloseButton, Footer, HeaderWrapper, Img, StyledModal, TextWrapper };
