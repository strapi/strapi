import React, { useState, useEffect } from 'react';
import {
  Page,
  Layouts,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Typography,
  Box,
  Select,
  Option,
  DatePicker,
  Button,
  Flex,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

interface AuditLog {
  id: number;
  documentId: string;
  contentType: string;
  recordId: string;
  action: string;
  userId?: number;
  username?: string;
  createdAt: string;
  changedFields?: any;
  payload?: any;
}

export const AuditLogsPage = () => {
  const { get } = useFetchClient();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
  });

  const [filters, setFilters] = useState({
    contentType: '',
    action: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
      });

      if (filters.contentType) params.append('contentType', filters.contentType);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());

      const { data } = await get(`/audit-log/audit-logs?${params.toString()}`);

      setLogs(data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: data.meta?.pagination?.total || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, pagination.pageSize]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: '#green',
      update: '#blue',
      delete: '#red',
    };
    return colors[action] || '#gray';
  };

  return (
    <Page.Main>
      <Page.Title>Audit Logs</Page.Title>

      <Layouts.Content>
        <Box padding={8}>
          <Typography variant="beta" as="h2">
            Audit Logs
          </Typography>
          <Typography variant="omega" textColor="neutral600">
            View all content changes tracked by the system
          </Typography>

          {/* Filters */}
          <Box padding={4} background="neutral0" marginTop={4}>
            <Flex gap={4}>
              <Select
                placeholder="Filter by action"
                value={filters.action}
                onChange={(value: string) => setFilters({ ...filters, action: value })}
              >
                <Option value="">All Actions</Option>
                <Option value="create">Create</Option>
                <Option value="update">Update</Option>
                <Option value="delete">Delete</Option>
              </Select>

              <Button onClick={fetchLogs} variant="secondary">
                Apply Filters
              </Button>
            </Flex>
          </Box>

          {/* Table */}
          <Box marginTop={4}>
            {loading ? (
              <Typography>Loading...</Typography>
            ) : (
              <Table colCount={6} rowCount={logs.length}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">Timestamp</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Action</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Content Type</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Record ID</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">User</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Changes</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {logs.map((log) => (
                    <Tr key={log.id}>
                      <Td>
                        <Typography textColor="neutral800">
                          {formatDate(log.createdAt)}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography
                          textColor="neutral800"
                          fontWeight="bold"
                          style={{ color: getActionBadge(log.action) }}
                        >
                          {log.action.toUpperCase()}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">{log.contentType}</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">{log.recordId}</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">
                          {log.username || 'System'}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">
                          {log.changedFields
                            ? Object.keys(log.changedFields).length + ' fields'
                            : '-'}
                        </Typography>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Box>

          {/* Pagination */}
          {pagination.total > pagination.pageSize && (
            <Box marginTop={4}>
              <Flex justifyContent="space-between">
                <Button
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page - 1 })
                  }
                >
                  Previous
                </Button>
                <Typography>
                  Page {pagination.page} of{' '}
                  {Math.ceil(pagination.total / pagination.pageSize)}
                </Typography>
                <Button
                  disabled={
                    pagination.page >= Math.ceil(pagination.total / pagination.pageSize)
                  }
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page + 1 })
                  }
                >
                  Next
                </Button>
              </Flex>
            </Box>
          )}
        </Box>
      </Layouts.Content>
    </Page.Main>
  );
};

