import { keyframes, styled } from 'styled-components';

const slide = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(400%); }
`;

const Track = styled.div`
  position: relative;
  width: 100%;
  height: 0.4rem;
  overflow: hidden;
  border-radius: 0.2rem;
  background: ${({ theme }) => theme.colors.primary200};
`;

const Fill = styled.div<{ $progress: number | null }>`
  height: 100%;
  border-radius: inherit;
  background: ${({ theme }) => theme.colors.primary600};
  transition: width 0.2s linear;
  width: ${({ $progress }) => ($progress === null ? '25%' : `${$progress}%`)};
  animation: ${({ $progress }) => ($progress === null ? slide : 'none')} 1.2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

interface UploadProgressBarProps {
  /** 0–100, or `null` for an upload whose size is not known. */
  progress: number | null;
  label: string;
}

export const UploadProgressBar = ({ progress, label }: UploadProgressBarProps) => (
  <Track
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={progress ?? undefined}
  >
    <Fill $progress={progress} />
  </Track>
);
