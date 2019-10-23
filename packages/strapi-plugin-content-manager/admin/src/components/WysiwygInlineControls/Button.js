import styled, { css } from 'styled-components';

import Bold from '../../assets/icons/icon_bold.svg';
import Italic from '../../assets/icons/icon_italic.svg';
import Underline from '../../assets/icons/icon_underline.svg';
import Ul from '../../assets/icons/icon_bullet-list.svg';
import Ol from '../../assets/icons/icon_numbered-list.svg';
import Quote from '../../assets/icons/icon_quote-block.svg';
import Code from '../../assets/icons/icon_code-block.svg';
import Link from '../../assets/icons/icon_link.svg';
import Striked from '../../assets/icons/icon_barred.svg';
import Img from '../../assets/icons/icon_media.svg';

const Button = styled.div`
  height: 32px;
  min-width: 32px;
  background-color: #ffffff;
  border: 1px solid rgba(16, 22, 34, 0.1);
  font-size: 13px;
  font-weight: 500;
  line-height: 32px;
  text-align: center;
  cursor: pointer;

  &:hover {
    background-color: #f3f4f4;
  }

  ${({ active, disabled }) => {
    if (active) {
      return css`
        border: 0;
        background: rgba(16, 22, 34, 0);
        box-shadow: inset 0 -1px 0 0 rgba(16, 22, 34, 0.04),
          inset 0 1px 0 0 rgba(16, 22, 34, 0.04);
      `;
    }

    if (disabled) {
      return css`
        opacity: 0.7;
        cursor: not-allowed;
      `;
    }
  }}

  ${({ type }) => {
    switch (type) {
      case 'bold':
        return css`
          background-image: url(${Bold});
        `;
      case 'italic':
        return css`
          background-image: url(${Italic});
        `;
      case 'underline':
        return css`
          background-image: url(${Underline});
        `;
      case 'ul':
        return css`
          background-image: url(${Ul});
        `;
      case 'ol':
        return css`
          background-image: url(${Ol});
        `;
      case 'link':
        return css`
          background-image: url(${Link});
        `;
      case 'quote':
        return css`
          background-image: url(${Quote});
        `;
      case 'code':
        return css`
          background-image: url(${Code});
        `;
      case 'striked':
        return css`
          background-image: url(${Striked});
        `;
      case 'img':
        return css`
          background-image: url(${Img});
        `;
      default:
        return css``;
    }
  }}

  background-position: center;
  background-repeat: no-repeat;
`;

export default Button;
