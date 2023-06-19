import { FieldAction } from '@strapi/design-system';
import styled from 'styled-components';

const FieldActionWrapper = styled(FieldAction)`
  svg {
    height: 1rem;
    width: 1rem;
    path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }
`;

export default FieldActionWrapper;
