import styled from 'styled-components';
import IntlText from '../IntlText';

const EmptyText = styled(IntlText)`
  position: absolute;
  width: 17rem;
  text-align: center;
  color: ${({ theme }) => theme.main.colors.white};
`;

export default EmptyText;
