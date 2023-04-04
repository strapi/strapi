import styled from 'styled-components';

export default styled.div`
  z-index: 1001;
  position: relative;
  opacity: ${(props) => (props.open ? 1 : 0)};

  [cmdk-overlay] {
    background: rgba(0, 0, 0, 0.8);

    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
  }

  [cmdk-dialog] {
    position: fixed;
    top: 20%;
    left: 50%;

    border-radius: 12px;
    max-width: 640px;
    width: 100%;
    overflow: hidden;
    box-shadow: 0 16px 70px rgba(0, 0, 0, 0.2);
    padding: 8px;
    transform-origin: 50%;
    transform: translateX(-50%) scale(1);
    outline: 0;

    background: ${({ theme }) => theme.colors.neutral100};
    border: 1px solid ${({ theme }) => theme.colors.neutral150};
  }

  [cmdk-input] {
    font-family: var(--font-sans);
    border: none;
    width: 100%;
    font-size: 17px;
    padding: 8px 8px 16px 8px;
    outline: none;
    color: ${({ theme }) => theme.colors.neutral600};
    background: ${({ theme }) => theme.colors.neutral100};
    border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
    margin-bottom: 16px;
    margin-top: 8px;
    border-radius: 0;
  }

  [cmdk-item] {
    content-visibility: auto;
    cursor: pointer;
    height: 48px;
    border-radius: 8px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
    color: ${({ theme }) => theme.colors.neutral600};
    user-select: none;
    will-change: background, color;
    transition: all 150ms ease;
    transition-property: none;

    &[aria-selected='true'] {
      background: ${({ theme }) => theme.colors.neutral150};
      color: ${({ theme }) => theme.colors.neutral600};
    }

    &[aria-disabled='true'] {
      color: ${({ theme }) => theme.colors.neutral400};
      cursor: not-allowed;
    }

    &:active {
      transition-property: background;
      background: ${({ theme }) => theme.colors.neutral0};
    }

    & + [cmdk-item] {
      margin-top: 4px;
    }

    svg path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }

  [cmdk-list] {
    height: 400px;
    max-height: 400px;
    overflow: auto;
    overscroll-behavior: contain;
    transition: 100ms ease;
    transition-property: height;
  }

  *:not([hidden]) + [cmdk-group] {
    margin-top: 8px;
  }

  [cmdk-group-heading] {
    user-select: none;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.neutral500};
    padding: 0 8px;
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  [cmdk-empty] {
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 48px;
    white-space: pre-wrap;
    color: ${({ theme }) => theme.colors.neutral500};
  }
`;
