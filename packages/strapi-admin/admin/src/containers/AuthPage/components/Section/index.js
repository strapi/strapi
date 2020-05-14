import styled from 'styled-components';

const Section = styled.section`
  text-align: ${({ textAlign }) => textAlign};
`;

Section.defaultProps = {
  textAlign: 'initial',
};

export default Section;
