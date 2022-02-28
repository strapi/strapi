import styled from 'styled-components';
import { FieldAction } from '@strapi/design-system/Field';

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
