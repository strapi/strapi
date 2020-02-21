import styled from 'styled-components';
import CardImgWrapper from '../CardImgWrapper';

const FileWrapper = styled(CardImgWrapper)`
  height: 401px;
  width: 100%;
  display: flex;
  > img {
    width: 100%;
    object-fit: contain;
    margin: auto;
  }
`;

export default FileWrapper;
