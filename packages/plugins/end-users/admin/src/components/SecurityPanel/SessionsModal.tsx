import {
  Button,
  Flex,
  Modal,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../utils/getTranslation';

import type { UserSecuritySession } from '../../../../shared/contracts/user-security';

interface SessionsModalProps {
  open: boolean;
  onClose: () => void;
  sessions: UserSecuritySession[];
  /** Whether the admin may sign sessions out */
  canSignOut: boolean;
  /** Asks to sign one session out: the panel confirms it */
  onSignOut: (session: UserSecuritySession) => void;
}

/** The sessions a user is signed in on, each of which can be signed out */
const SessionsModal = ({ open, onClose, sessions, canSignOut, onSignOut }: SessionsModalProps) => {
  const { formatMessage, formatDate } = useIntl();

  const when = (value: string) => formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Modal.Root open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslation('security-panel.sessions.title'),
              defaultMessage: 'Sessions',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {sessions.length === 0 ? (
            <Typography textColor="neutral600">
              {formatMessage({
                id: getTranslation('security-panel.sessions.none'),
                defaultMessage: 'This user is not signed in anywhere.',
              })}
            </Typography>
          ) : (
            <Table colCount={4} rowCount={sessions.length + 1}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma" tag="span" textColor="neutral600">
                      {formatMessage({
                        id: getTranslation('security-panel.sessions.started'),
                        defaultMessage: 'Signed in',
                      })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma" tag="span" textColor="neutral600">
                      {formatMessage({
                        id: getTranslation('security-panel.sessions.expires'),
                        defaultMessage: 'Expires',
                      })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma" tag="span" textColor="neutral600">
                      {formatMessage({
                        id: getTranslation('security-panel.sessions.device'),
                        defaultMessage: 'Device',
                      })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma" tag="span" textColor="neutral600">
                      {formatMessage({
                        id: getTranslation('security-panel.sessions.actions'),
                        defaultMessage: 'Actions',
                      })}
                    </Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {sessions.map((session) => (
                  <Tr key={session.id}>
                    <Td>
                      <Typography>{when(session.createdAt)}</Typography>
                    </Td>
                    <Td>
                      <Typography>{when(session.expiresAt)}</Typography>
                    </Td>
                    <Td maxWidth="24rem">
                      <Flex direction="column" alignItems="flex-start" gap={1}>
                        <Typography>{session.ipAddress ?? '-'}</Typography>
                        {session.userAgent && (
                          // The whole string is the title: it is long, and must not widen the modal
                          <Typography
                            variant="pi"
                            textColor="neutral600"
                            ellipsis
                            title={session.userAgent}
                            maxWidth="100%"
                          >
                            {session.userAgent}
                          </Typography>
                        )}
                      </Flex>
                    </Td>
                    <Td>
                      {canSignOut && (
                        <Button variant="danger-light" size="S" onClick={() => onSignOut(session)}>
                          {formatMessage({
                            id: getTranslation('security-panel.sessions.sign-out'),
                            defaultMessage: 'Sign out',
                          })}
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">
              {formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
            </Button>
          </Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { SessionsModal };
export type { SessionsModalProps };
