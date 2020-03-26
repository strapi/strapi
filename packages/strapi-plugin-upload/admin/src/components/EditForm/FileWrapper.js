import styled from 'styled-components';
import CardImgWrapper from '../CardImgWrapper';

const FileWrapper = styled(CardImgWrapper)`
  height: 401px;
  width: 100%;
  display: flex;
  position: relative;
  background-color: ${({ theme }) => theme.main.colors.black};

  .cropper-view-box {
    outline-color: ${({ theme }) => theme.main.colors.white};
  }
  .cropper-point {
    background-color: ${({ theme }) => theme.main.colors.white};
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
