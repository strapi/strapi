import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';

const Download = styled(FontAwesomeIcon)`
  margin-left: 10px;
  transform: rotate(-45deg);
`;

Download.defaultProps = {
  icon: 'arrow-right',
};

export default Download;
