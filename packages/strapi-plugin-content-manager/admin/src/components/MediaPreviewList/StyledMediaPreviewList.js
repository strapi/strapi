import styled, { css } from 'styled-components';

const sizes = {
  small: '35px',
  big: '127px',
  margin: '20px',
};
const max = 4;

const StyledMediaPreviewList = styled.div`
  position: relative;
  height: ${sizes.small};
  > div {
    position: absolute;
    top: 0;
    ${createCSS()};
  }
`;

function createCSS() {
  let styles = '';

  for (let i = 0; i <= max; i += 1) {
    styles += `
      &:nth-of-type(${i}) {
        left: calc( ${sizes.margin} * ${i - 1});
        z-index: ${i};
      }
    `;
  }

  return css`
    ${styles}
  `;
}

const MediaPreviewItem = styled.div`
  width: ${sizes.small};
  height: ${sizes.small};
  div {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: calc(${sizes.small} / 2);
    background-color: #fafafb;
  }
  &.hoverable {
    :hover {
      z-index: ${max + 1};
    }
  }
`;

const MediaPreviewFile = styled(MediaPreviewItem)`
  div {
    position: relative;
    background-color: #9fa7b6;
    color: white;
    text-align: center;
    line-height: ${sizes.small};
    font-size: 13px;
    i {
      position: absolute;
      left: 0;
      top: 0;
      font-size: 15px;
      width: 100%;
      height: 100%;
      &:before {
        width: 100%;
        height: 100%;
        padding: 10px;
        line-height: 35px;
        background: #9fa7b6;
      }
    }
  }
  div + span {
    display: none;
    color: #333740;
    position: absolute;
    left: 100%;
    bottom: -10px;
  }
  &.hoverable {
    :hover {
      div + span {
        display: block;
      }
    }
  }
`;

const MediaPreviewText = styled(MediaPreviewItem)`
  div {
    font-size: 13px;
    color: #333740;
    text-align: center;
    line-height: ${sizes.small};
  }
`;

const MediaPreviewImage = styled(MediaPreviewItem)`
  img {
    display: block;
    object-fit: cover;
    background-color: #fafafb;
  }
  div {
    position: relative;
    &::before {
      content: '-';
      position: absolute;
      width: 100%;
      height: 100%;
      background: white;
      color: transparent;
      opacity: 0;
    }
    img {
      width: 100%;
      height: 100%;
    }
  }
  div + img {
    display: none;
    width: ${sizes.big};
    height: ${sizes.big};
    border-radius: calc(${sizes.big} / 2);
    margin-top: calc(-${sizes.big} - ${sizes.small} - 5px);
    margin-left: calc((-${sizes.big} + ${sizes.small}) / 2);
  }

  &.hoverable {
    :hover {
      div {
        &::before {
          opacity: 0.6;
        }
      }
      div + img {
        display: block;
      }
    }
  }
`;

export {
  MediaPreviewFile,
  MediaPreviewImage,
  MediaPreviewItem,
  MediaPreviewText,
  StyledMediaPreviewList,
};
