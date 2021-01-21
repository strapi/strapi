import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const ModalSection = styled.section`
  display: flex;
  justify-content: ${({ justifyContent }) => justifyContent};
  padding: 0 ${({ theme }) => theme.main.sizes.paddings.md};
`;

ModalSection.defaultProps = {
  justifyContent: 'initial',
};

ModalSection.propTypes = {
  ...themePropTypes,
  justifyContent: PropTypes.string,
};

export default ModalSection;
