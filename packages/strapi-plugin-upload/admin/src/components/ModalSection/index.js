import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const ModalSection = styled.section`
  display: flex;

  padding: 0 ${({ theme }) => theme.main.sizes.padding.md};
`;

ModalSection.propTypes = themePropTypes;

export default ModalSection;
