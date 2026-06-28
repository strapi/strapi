import type { ReactNode } from 'react';

import { FeedbackProvider } from '../FeedbackModal';
import { UploadProjectToChatProvider } from '../UploadCodeModal';
import { UploadFigmaToChatProvider } from '../UploadFigmaModal';

import { ChatProvider } from './ChatProvider';
import { SchemaChatProvider } from './SchemaProvider';

export const ChatProviders = ({
  children,
  defaultOpen = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) => {
  return (
    <ChatProvider defaultOpen={defaultOpen}>
      <SchemaChatProvider>
        <UploadProjectToChatProvider>
          <UploadFigmaToChatProvider>
            <FeedbackProvider>{children}</FeedbackProvider>
          </UploadFigmaToChatProvider>
        </UploadProjectToChatProvider>
      </SchemaChatProvider>
    </ChatProvider>
  );
};
