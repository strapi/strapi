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

  .cropper-view-box {
    outline-color: #ffffff;
  }
  .cropper-point {
    background-color: #ffffff;
    border-radius: 50%;
  }

  .point-se {
    &:before {
      display: none;
    }
    height: 5px;
    width: 5px;
  }
`;

export default FileWrapper;
