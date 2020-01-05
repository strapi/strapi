import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 20px;
  color: ${({ type }) => {
    switch (type) {
      case 'file-pdf':
        return '#E26D6D';
      case 'file-image':
        return '#8AA066';
      case 'file-video':
        return '#77C69E';
      case 'file-code':
        return '#515A6D';
      case 'file-archive':
        return '#715A31';
      default:
        return '#BDBFC2';
    }
  }};
`;

export default Wrapper;
