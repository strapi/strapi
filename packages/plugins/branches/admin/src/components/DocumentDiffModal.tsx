import {
  Button,
  Flex,
  Loader,
  Modal,
  Radio,
  Status,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetDocumentDiffQuery, type AttributeDiff } from '../services/branches';
import { getTranslation } from '../utils/getTranslation';
import { DiffValue } from './DiffValue';

export type Resolution = 'branch' | 'parent';

interface DocumentDiffModalProps {
  branchId: number;
  parentName: string;
  contentType: string;
  documentId: string;
  locale: string | null;
  resolutions: Record<string, Resolution>;
  onResolve: (attribute: string, choice: Resolution) => void;
  onClose: () => void;
}

const StatusCell = ({
  status,
  parentName,
}: {
  status: AttributeDiff['status'];
  parentName: string;
}) => {
  const { formatMessage } = useIntl();
  const variant = status === 'conflict' ? 'danger' : status === 'clean' ? 'success' : 'secondary';
  const label =
    status === 'conflict'
      ? formatMessage({ id: getTranslation('diff.status.conflict'), defaultMessage: 'Conflict' })
      : status === 'clean'
        ? formatMessage({ id: getTranslation('diff.status.clean'), defaultMessage: 'Ready' })
        : formatMessage(
            { id: getTranslation('diff.status.same'), defaultMessage: 'Already on {parent}' },
            { parent: parentName }
          );
  return (
    <Status variant={variant} size="S">
      <Typography tag="span" variant="omega" fontWeight="bold">
        {label}
      </Typography>
    </Status>
  );
};

/**
 * Attribute-level diff of one document: value when branched / on the parent
 * now / on the branch. Conflicting rows carry a "keep" choice the merge page
 * collects.
 */
export const DocumentDiffModal = ({
  branchId,
  parentName,
  contentType,
  documentId,
  locale,
  resolutions,
  onResolve,
  onClose,
}: DocumentDiffModalProps) => {
  const { formatMessage } = useIntl();
  const { data, isLoading } = useGetDocumentDiffQuery({
    id: branchId,
    contentType,
    documentId,
    locale,
  });

  return (
    <Modal.Root open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Modal.Content style={{ maxWidth: '96rem', width: '96rem' }}>
        <Modal.Header>
          <Modal.Title>
            {formatMessage(
              { id: getTranslation('diff.title'), defaultMessage: 'Changes to {title}' },
              { title: data?.title ?? documentId }
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoading || !data ? (
            <Flex justifyContent="center" padding={6}>
              <Loader />
            </Flex>
          ) : (
            <Table colCount={5} rowCount={data.attributes.length + 1}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">
                      {formatMessage({
                        id: getTranslation('diff.column.attribute'),
                        defaultMessage: 'Attribute',
                      })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {formatMessage({
                        id: getTranslation('diff.column.base'),
                        defaultMessage: 'When branched',
                      })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {formatMessage(
                        {
                          id: getTranslation('diff.column.parent'),
                          defaultMessage: '{parent} now',
                        },
                        { parent: parentName }
                      )}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {formatMessage({
                        id: getTranslation('diff.column.branch'),
                        defaultMessage: 'Branch',
                      })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      {formatMessage({
                        id: getTranslation('diff.column.resolution'),
                        defaultMessage: 'Keep',
                      })}
                    </Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.attributes.map((row) => (
                  <Tr key={row.attribute}>
                    <Td>
                      <Flex direction="column" alignItems="flex-start" gap={1}>
                        <Typography fontWeight="semiBold">{row.attribute}</Typography>
                        <StatusCell status={row.status} parentName={parentName} />
                      </Flex>
                    </Td>
                    <Td style={{ verticalAlign: 'top', maxWidth: '20rem' }}>
                      <DiffValue type={row.type} value={row.base} />
                    </Td>
                    <Td style={{ verticalAlign: 'top', maxWidth: '20rem' }}>
                      <DiffValue type={row.type} value={row.parent} />
                    </Td>
                    <Td style={{ verticalAlign: 'top', maxWidth: '20rem' }}>
                      <DiffValue type={row.type} value={row.branch} />
                    </Td>
                    <Td style={{ verticalAlign: 'top' }}>
                      {row.status === 'conflict' ? (
                        <Radio.Group
                          value={resolutions[row.attribute] ?? ''}
                          onValueChange={(value: string) =>
                            onResolve(row.attribute, value as Resolution)
                          }
                          aria-label={row.attribute}
                        >
                          <Flex direction="column" alignItems="flex-start" gap={2}>
                            <Radio.Item value="branch">
                              {formatMessage({
                                id: getTranslation('diff.keep.branch'),
                                defaultMessage: 'Branch',
                              })}
                            </Radio.Item>
                            <Radio.Item value="parent">
                              {formatMessage(
                                {
                                  id: getTranslation('diff.keep.parent'),
                                  defaultMessage: '{parent}',
                                },
                                { parent: parentName }
                              )}
                            </Radio.Item>
                          </Flex>
                        </Radio.Group>
                      ) : (
                        <Typography textColor="neutral500" variant="pi">
                          —
                        </Typography>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="tertiary" onClick={onClose}>
            {formatMessage({ id: getTranslation('diff.close'), defaultMessage: 'Close' })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
