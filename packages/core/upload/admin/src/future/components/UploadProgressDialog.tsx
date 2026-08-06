import * as React from 'react';

import { Flex, IconButton, TextButton, Typography } from '@strapi/design-system';
import {
  ArrowsCounterClockwise,
  Check,
  CheckCircle,
  ChevronDown,
  Cross,
  CrossCircle,
  Information,
  MinusCircle,
  Sparkle,
  Upload,
  WarningCircle,
} from '@strapi/icons';
import { useIntl } from 'react-intl';
import { keyframes, styled } from 'styled-components';

import { abortUpload, useRetryCancelledFilesMutation } from '../services/api';
import { useTypedDispatch, useTypedSelector } from '../store/hooks';
import {
  closeUploadProgress,
  toggleMinimize,
  cancelUpload,
  selectAggregateProgress,
  selectMetadataProgress,
  selectIsGeneratingMetadata,
  selectMetadataOutcome,
} from '../store/uploadProgress';
import { getTranslationKey } from '../utils/translations';

import { Drawer } from './Drawer';

import type { FileMetadataStatus, FileProgress, FileProgressStatus } from '../store/uploadProgress';
import type { MessageDescriptor } from 'react-intl';

/* -------------------------------------------------------------------------------------------------
 * DialogHeader
 * -----------------------------------------------------------------------------------------------*/

const HeaderStatusMessage = ({
  title,
  subtitle,
  metadataSubtitle,
}: {
  title: string;
  subtitle?: string;
  metadataSubtitle?: string;
}) => {
  return (
    <Flex direction="column" alignItems="flex-start" paddingLeft={2}>
      <Drawer.Title>
        <Typography variant="omega">{title}</Typography>
      </Drawer.Title>
      <Drawer.Description>
        <Typography variant="pi" textColor="neutral600">
          {subtitle}
        </Typography>
      </Drawer.Description>
      {metadataSubtitle && (
        <Typography variant="pi" textColor="neutral600">
          {metadataSubtitle}
        </Typography>
      )}
    </Flex>
  );
};

const HeaderStatusIcon = styled(Flex)`
  padding: ${({ theme }) => theme.spaces[3]};
  border-radius: ${({ theme }) => `${theme.borderRadius} 0 0 ${theme.borderRadius}`};

  > svg {
    height: 24px;
    width: 24px;
  }
`;

const HeaderStatusWrapper = styled(Flex)`
  align-items: center;
`;

type HeaderStatusProps = {
  status: 'uploading' | 'success' | 'error' | 'canceled';
  progress?: number;
  totalFiles: number;
  successfulCount: number;
  errorCount: number;
  /**
   * Count-based metadata progress, or `null` when no row entered the metadata phase.
   * Shown as an extra subtitle while generation is still in flight.
   */
  metadataProgress: number | null;
  /** Whether any row is still generating — drives whether the subtitle shows at all. */
  isGeneratingMetadata: boolean;
  /**
   * Terminal per-outcome counts, or `null` while the phase is unfinished or was never
   * entered. Replaces the in-flight subtitle once generation settles.
   */
  metadataOutcome: { generated: number; skipped: number; failed: number } | null;
};

const HeaderStatus = ({
  status,
  progress,
  totalFiles,
  successfulCount,
  errorCount,
  metadataProgress,
  isGeneratingMetadata,
  metadataOutcome,
}: HeaderStatusProps) => {
  const { formatMessage } = useIntl();

  // Completion is upload-driven, so the terminal header can appear while metadata is
  // still generating — the subtitle keeps ticking underneath until it settles.
  //
  // Gated on work actually being in flight rather than on `progress < 100`: in a
  // sequential batch the percentage touches 100% between files, which would blink the
  // subtitle out and back in on every upload.
  //
  // Once the phase settles the line is not dropped but replaced with the outcome, so the
  // header keeps confirming what happened instead of silently losing the message.
  const metadataSubtitle = (() => {
    if (metadataProgress !== null && isGeneratingMetadata) {
      return formatMessage(
        {
          id: getTranslationKey('upload.progress.generatingMetadata.withCount'),
          defaultMessage: 'Generating metadata with AI ({percentage}%)',
        },
        { percentage: metadataProgress }
      );
    }

    if (metadataOutcome === null) {
      return undefined;
    }

    // Only `generated` rows had metadata written, so only they can be reported as a
    // success. With none, there is nothing to confirm — an all-skipped batch of
    // non-images would otherwise read as "generated on 0 files". Per-row sublines
    // already spell out skipped and failed outcomes.
    if (metadataOutcome.generated === 0) {
      return undefined;
    }

    if (metadataOutcome.failed > 0) {
      return formatMessage(
        {
          id: getTranslationKey('upload.progress.metadataGenerated.withFailures'),
          defaultMessage: '{generatedCount} generated, {failedCount} failed',
        },
        { generatedCount: metadataOutcome.generated, failedCount: metadataOutcome.failed }
      );
    }

    return formatMessage(
      {
        id: getTranslationKey('upload.progress.metadataGenerated.withCount'),
        defaultMessage:
          '{count, plural, one {Metadata successfully generated on # file} other {Metadata successfully generated on # files}}',
      },
      { count: metadataOutcome.generated }
    );
  })();

  if (status === 'error') {
    return (
      <HeaderStatusWrapper>
        <HeaderStatusIcon background="danger200">
          <Cross fill="danger700" />
        </HeaderStatusIcon>
        <HeaderStatusMessage
          title={formatMessage({
            id: getTranslationKey('upload.progress.failed'),
            defaultMessage: 'Upload failed',
          })}
          subtitle={formatMessage({
            id: getTranslationKey('upload.progress.failed.subtitle'),
            defaultMessage: 'Please try to upload files again',
          })}
        />
      </HeaderStatusWrapper>
    );
  }

  if (status === 'success') {
    const subtitle =
      errorCount > 0
        ? formatMessage(
            {
              id: getTranslationKey('upload.progress.success.subtitle.withErrors'),
              defaultMessage: '{successCount} uploaded, {errorCount} failed',
            },
            { successCount: successfulCount, errorCount }
          )
        : formatMessage(
            {
              id: getTranslationKey('upload.progress.success.subtitle'),
              defaultMessage: '{count} files uploaded successfully',
            },
            { count: successfulCount }
          );

    return (
      <HeaderStatusWrapper>
        <HeaderStatusIcon background="success200">
          <Check fill="success700" />
        </HeaderStatusIcon>
        <HeaderStatusMessage
          title={formatMessage({
            id: getTranslationKey('upload.progress.success'),
            defaultMessage: 'Upload successful!',
          })}
          subtitle={subtitle}
          metadataSubtitle={metadataSubtitle}
        />
      </HeaderStatusWrapper>
    );
  }

  if (status === 'canceled') {
    return (
      <HeaderStatusWrapper>
        <HeaderStatusIcon background="neutral200">
          <MinusCircle fill="neutral700" />
        </HeaderStatusIcon>
        <HeaderStatusMessage
          title={formatMessage({
            id: getTranslationKey('upload.progress.canceled'),
            defaultMessage: 'Upload canceled',
          })}
          subtitle={formatMessage({
            id: getTranslationKey('upload.progress.canceled.subtitle'),
            defaultMessage: 'Some files were not uploaded',
          })}
          metadataSubtitle={metadataSubtitle}
        />
      </HeaderStatusWrapper>
    );
  }

  if (status === 'uploading') {
    const progressPercentage = progress ? Math.round(progress) : 0;

    return (
      <HeaderStatusWrapper>
        <HeaderStatusIcon background="primary200">
          <Upload fill="primary700" />
        </HeaderStatusIcon>
        <HeaderStatusMessage
          title={formatMessage(
            {
              id: getTranslationKey('upload.progress.uploading.withCount'),
              defaultMessage: 'Uploading {total} items ({percentage}%)',
            },
            {
              total: totalFiles,
              percentage: progressPercentage,
            }
          )}
          metadataSubtitle={metadataSubtitle}
        />
      </HeaderStatusWrapper>
    );
  }

  return null;
};

const HeaderIconButton = styled(IconButton)`
  &:hover {
    background: transparent;
  }
`;

const ChevronWrapper = styled.span<{ $isMinimized: boolean }>`
  display: flex;
  transition: transform 0.5s ease-in-out;
  transform: ${({ $isMinimized }) => ($isMinimized ? 'rotate(180deg)' : 'rotate(0deg)')};
`;

const HEADER_COLOR_MAP = {
  uploading: { background: 'primary100' },
  canceled: { background: 'neutral100' },
  success: { background: 'success100' },
  error: { background: 'danger100' },
} as const;

const DialogHeader = ({ handleClose }: { handleClose: () => void }) => {
  const { formatMessage } = useIntl();

  const { isMinimized, files, uploadId, totalFiles } = useTypedSelector(
    (state) => state.uploadProgress
  );
  const progress = useTypedSelector(selectAggregateProgress);
  const metadataProgress = useTypedSelector(selectMetadataProgress);
  const isGeneratingMetadata = useTypedSelector(selectIsGeneratingMetadata);
  const metadataOutcome = useTypedSelector(selectMetadataOutcome);
  const dispatch = useTypedDispatch();
  const [retryCancelledFiles] = useRetryCancelledFilesMutation();

  // The batch is complete once every file has reached a terminal state. Byte-weighted
  // progress can't be used here because errored/cancelled rows never reach 100%.
  const isComplete =
    files.length > 0 &&
    files.every((f) => f.status === 'complete' || f.status === 'error' || f.status === 'cancelled');
  const isAllUploaded = isComplete;
  const isAllErrored = isComplete && files.every((f) => f.status === 'error');
  const hasCancelledFiles = files.some((f) => f.status === 'cancelled');
  const successfulCount = files.filter((f) => f.status === 'complete').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  // Success includes partial success (some files succeeded, even if some failed)
  const isSuccess = isComplete && successfulCount > 0 && !hasCancelledFiles;
  const status = ((): HeaderStatusProps['status'] => {
    if (isAllErrored) return 'error';
    if (isSuccess) return 'success';
    if (hasCancelledFiles) return 'canceled';

    return 'uploading';
  })();

  const handleCancel = () => {
    abortUpload(uploadId);
    dispatch(cancelUpload());
  };

  const handleRetry = async () => {
    try {
      await retryCancelledFiles().unwrap();
    } catch {
      // Error is already dispatched to store from the API queryFn
    }
  };

  const handleToggleMinimize = () => {
    dispatch(toggleMinimize());
  };

  return (
    <Flex
      background={HEADER_COLOR_MAP[status].background}
      justifyContent="space-between"
      margin={1}
      hasRadius
    >
      <HeaderStatus
        status={status}
        progress={progress}
        totalFiles={totalFiles}
        successfulCount={successfulCount}
        errorCount={errorCount}
        metadataProgress={metadataProgress}
        isGeneratingMetadata={isGeneratingMetadata}
        metadataOutcome={metadataOutcome}
      />
      <Flex gap={1}>
        {!isAllUploaded && (
          <TextButton onClick={handleCancel} fontWeight="bold">
            {formatMessage({
              id: getTranslationKey('upload.progress.cancel'),
              defaultMessage: 'Cancel all',
            })}
          </TextButton>
        )}
        {hasCancelledFiles && (
          <TextButton onClick={handleRetry} fontWeight="bold">
            {formatMessage({
              id: getTranslationKey('upload.progress.retry'),
              defaultMessage: 'Retry',
            })}
          </TextButton>
        )}
        <HeaderIconButton
          onClick={handleToggleMinimize}
          label={formatMessage({
            id: getTranslationKey(
              isMinimized ? 'upload.progress.maximize' : 'upload.progress.minimize'
            ),
            defaultMessage: isMinimized ? 'Maximize' : 'Minimize',
          })}
          variant="ghost"
        >
          <ChevronWrapper $isMinimized={isMinimized}>
            <ChevronDown />
          </ChevronWrapper>
        </HeaderIconButton>
        {isComplete && (
          <Drawer.CloseButton
            onClose={handleClose}
            label={formatMessage({
              id: getTranslationKey('upload.progress.close'),
              defaultMessage: 'Close',
            })}
          />
        )}
      </Flex>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * UploadProgressDialog
 * -----------------------------------------------------------------------------------------------*/

const ProgressTrack = styled.div`
  width: 100%;
  height: ${({ theme }) => theme.spaces[1]};
  background-color: ${({ theme }) => theme.colors.neutral200};
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressIndicator = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background-color: ${({ theme }) => theme.colors.primary700};
  border-radius: 4px;
  transition: width 0.15s linear;
`;

const DeterminateBar = ({ percent }: { percent: number }) => {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <ProgressTrack role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped}>
      <ProgressIndicator $percent={clamped} />
    </ProgressTrack>
  );
};

const INDETERMINATE_INDICATOR_WIDTH = 40;

/**
 * `translateX` percentages resolve against the *indicator's* own width, not the track's.
 * So -100% is exactly "fully off the left edge" regardless of the width above, and the
 * end offset converts a full track width into those same own-width units. Both ends sit
 * flush off-track, which keeps entry and exit symmetric — a smaller start offset would
 * make the bar pop in already partly visible.
 */
const indeterminateSlide = keyframes`
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(${(100 / INDETERMINATE_INDICATOR_WIDTH) * 100}%);
  }
`;

const IndeterminateIndicator = styled.div`
  height: 100%;
  width: ${INDETERMINATE_INDICATOR_WIDTH}%;
  background-color: ${({ theme }) => theme.colors.primary700};
  border-radius: 4px;
  /* Linear, not an eased curve: the DS easings decelerate to a stop, which on a loop
     reads as a stall at the wrap point. Constant speed is what makes it read as a sweep. */
  animation: ${indeterminateSlide} 1.2s linear infinite;

  /* A perpetually moving bar is a vestibular trigger; fall back to a static track fill. */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    width: 100%;
    opacity: 0.5;
  }
`;

/**
 * Progress bar for work whose completion fraction is genuinely unknowable, rather
 * than merely unknown-yet: the AI metadata endpoint answers in one go, and the URL
 * flow can't report bytes until the server has fetched the file and knows its size.
 *
 * Deliberately omits `aria-valuenow` — that absence is precisely how ARIA conveys
 * an indeterminate progressbar, so assistive tech announces "busy" instead of "0%".
 */
const IndeterminateBar = () => {
  return (
    <ProgressTrack role="progressbar" aria-valuemin={0} aria-valuemax={100}>
      <IndeterminateIndicator />
    </ProgressTrack>
  );
};

const FileRow = ({
  icon,
  fileName,
  children,
}: {
  icon: React.ReactNode;
  fileName: string;
  children: React.ReactNode;
}) => {
  return (
    <Flex direction="column" alignItems="stretch" justifyContent="center" gap={1} width="100%">
      <Flex gap={2}>
        {icon}
        <Typography variant="omega" fontWeight="semiBold" ellipsis>
          {fileName}
        </Typography>
      </Flex>
      {children}
    </Flex>
  );
};

/**
 * Icon + subline for a successfully uploaded row, keyed by its metadata phase.
 * `'none'` covers rows that never entered the phase — AI metadata disabled — and
 * renders exactly as before this feature existed. Non-images do enter the phase and
 * land on `skipped`.
 *
 * `skipped` uses a neutral `Information` icon, deliberately distinct from
 * generated/failed/cancelled — skipping is an expected outcome for a non-image, not a
 * problem to flag.
 */
const COMPLETED_ROW_PRESENTATION: Record<
  FileMetadataStatus | 'none',
  { icon: React.ReactNode; message: MessageDescriptor }
> = {
  none: {
    icon: <CheckCircle fill="success500" />,
    message: {
      id: getTranslationKey('upload.progress.file.uploaded'),
      defaultMessage: 'Uploaded',
    },
  },
  generating: {
    icon: <Sparkle fill="primary600" />,
    message: {
      id: getTranslationKey('upload.progress.file.generatingMetadata'),
      defaultMessage: 'Uploaded • Generating metadata…',
    },
  },
  generated: {
    icon: <CheckCircle fill="success500" />,
    message: {
      id: getTranslationKey('upload.progress.file.metadataGenerated'),
      defaultMessage: 'Uploaded • Metadata generated',
    },
  },
  skipped: {
    icon: <Information fill="neutral500" />,
    message: {
      id: getTranslationKey('upload.progress.file.metadataSkipped'),
      defaultMessage: 'Upload complete • Metadata generation skipped',
    },
  },
  failed: {
    icon: <WarningCircle fill="warning500" />,
    message: {
      id: getTranslationKey('upload.progress.file.metadataFailed'),
      defaultMessage: 'Upload complete • Metadata generation failed',
    },
  },
};

const FileRowRenderer = ({ file }: { file: FileProgress }) => {
  const { formatMessage } = useIntl();
  const isError = file.status === 'error';
  const isCurrentFile = file.status === 'uploading';
  const isCompleted = file.status === 'complete';
  const isCancelled = file.status === 'cancelled';

  if (isCurrentFile) {
    // Determinate only once bytes are actually being reported — a known `size` is not
    // enough. The two upload flows differ here:
    //  - the direct-file flow streams real byte counts from XHR, so `uploadedBytes`
    //    climbs and a determinate bar is meaningful;
    //  - the URL flow learns the size from the `file:uploading` SSE event but receives
    //    no incremental counts at all (the next event is `file:complete`), so
    //    `uploadedBytes` stays 0 for the whole transfer.
    // Keying off `size` alone froze URL rows at a determinate 0% for the entire upload;
    // keying off reported bytes keeps them animating until there is a fraction to show.
    const hasReportedProgress = file.size > 0 && file.uploadedBytes > 0;

    return (
      <FileRow icon={<ArrowsCounterClockwise fill="secondary600" />} fileName={file.name}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTranslationKey('upload.progress.file.uploading'),
            defaultMessage: 'Uploading...',
          })}
        </Typography>
        {hasReportedProgress ? (
          <DeterminateBar percent={(file.uploadedBytes / file.size) * 100} />
        ) : (
          <IndeterminateBar />
        )}
      </FileRow>
    );
  }

  if (isError) {
    return (
      <FileRow icon={<CrossCircle fill="danger500" />} fileName={file.name}>
        <Typography variant="pi" textColor="neutral600">
          {file.error}
        </Typography>
      </FileRow>
    );
  }

  if (isCancelled) {
    return (
      <FileRow icon={<MinusCircle fill="neutral600" />} fileName={file.name}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTranslationKey('upload.progress.file.canceled'),
            defaultMessage: 'Canceled',
          })}
        </Typography>
      </FileRow>
    );
  }

  if (isCompleted) {
    // The upload succeeded; the metadata phase (if any) drives both the icon and the
    // subline from here on — a metadata failure shows a warning, not an upload error.
    const { icon, message } = COMPLETED_ROW_PRESENTATION[file.metadataStatus ?? 'none'];

    return (
      <FileRow icon={icon} fileName={file.name}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage(message)}
        </Typography>
        {/* Generation has no intermediate progress to report, so the bar stays indeterminate. */}
        {file.metadataStatus === 'generating' && <IndeterminateBar />}
      </FileRow>
    );
  }

  return null;
};

const CompletedFilesList = styled(Flex)`
  flex-direction: column;
  gap: ${({ theme }) => theme.spaces[2]};
  width: 100%;
`;

export const UploadProgressDialog = () => {
  const dispatch = useTypedDispatch();
  const { isVisible, isMinimized, files } = useTypedSelector((state) => state.uploadProgress);

  // With concurrent uploads several files are `uploading` at once — render every
  // in-flight row, not just the first (a `find` here dated to the strictly
  // sequential era and hid all but the lowest-index worker's row).
  const uploadingFiles = files.filter((f) => f.status === 'uploading');
  const completedFiles = files
    .filter((f) => f.status === 'complete' || f.status === 'error' || f.status === 'cancelled')
    .sort((a, b) => {
      // Sort priority: error > cancelled > complete
      const priority: Record<FileProgressStatus, number> = {
        error: 0,
        cancelled: 1,
        complete: 2,
        uploading: 3,
        pending: 4,
      };
      return priority[a.status] - priority[b.status];
    });

  const handleClose = () => {
    dispatch(closeUploadProgress());
  };

  return (
    <Drawer.Root isVisible={isVisible} onClose={handleClose}>
      <Drawer.Body animationDirection="up" width="41.6rem" maxHeight="34.2rem">
        <DialogHeader handleClose={handleClose} />
        <Drawer.ScrollableContent isContentExpanded={!isMinimized}>
          <Flex
            direction="column"
            alignItems="stretch"
            gap={4}
            paddingTop={4}
            paddingBottom={4}
            paddingLeft={4}
            paddingRight={4}
          >
            {uploadingFiles.map((file) => (
              <FileRowRenderer key={file.index} file={file} />
            ))}

            {completedFiles.length > 0 && (
              <CompletedFilesList>
                {completedFiles.map((file) => (
                  <FileRowRenderer key={file.index} file={file} />
                ))}
              </CompletedFilesList>
            )}
          </Flex>
        </Drawer.ScrollableContent>
      </Drawer.Body>
    </Drawer.Root>
  );
};
