import styled from 'styled-components';
import IntlText from '../IntlText';

const EmptyText = styled(IntlText)`
  color: ${({ theme }) => theme.main.colors.white};
  position: absolute;
  width: 17rem;
  text-align: center;
`;

export default EmptyText;
