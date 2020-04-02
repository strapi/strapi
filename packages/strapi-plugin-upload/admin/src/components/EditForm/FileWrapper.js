import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

import CardImgWrapper from '../CardImgWrapper';

const FileWrapper = styled(CardImgWrapper)`
  height: 401px;
  width: 100%;
  display: flex;
  position: relative;
  background-color: ${({ theme }) => theme.main.colors.black};
  ${({ hasError, theme }) => hasError && `border: 2px solid ${theme.main.colors.orange};`}

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

FileWrapper.defaultProps = {
  hasError: false,
};

FileWrapper.propTypes = {
  hasError: PropTypes.bool,
  ...themePropTypes,
};

export default FileWrapper;
