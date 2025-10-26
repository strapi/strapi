import React, { useState, useEffect } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Box,
  Typography,
  Flex,
  IconButton,
  Pagination,
  DatePicker,
  Select,
  Option,
} from '@strapi/design-system';
import { Filter, Search } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { ContentLayout, HeaderLayout } from '@strapi/design-system/Layout';

const AuditLogsPage = () => {
  const { formatMessage, formatDate } = useIntl();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    contentType: '',
    action: '',
    startDate: null,
    endDate: null,
  });

  const fetchLogs = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(filters.contentType && { content_type: filters.contentType }),
        ...(filters.action && { action: filters.action }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
      });

      const response = await fetch(`/audit-logs?${queryParams}`);
      const data = await response.json();
      
      setLogs(data.data);
      setPagination(prev => ({
        ...prev,
        total: data.meta.pagination.total,
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, pagination.pageSize, filters]);

  const actionTypes = [
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
  ];

  return (
    <>
      <HeaderLayout
        title={formatMessage({ id: 'audit-logs.page.title', defaultMessage: 'Audit Logs' })}
        subtitle={formatMessage({
          id: 'audit-logs.page.subtitle',
          defaultMessage: 'Track all content changes in your application',
        })}
      />
      
      <ContentLayout>
        <Box padding={4}>
          {/* Filters */}
          <Flex gap={4} marginBottom={4}>
            <Select
              value={filters.action}
              onChange={value => setFilters(prev => ({ ...prev, action: value }))}
              placeholder="Filter by action"
            >
              {actionTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
            
            <DatePicker
              onChange={date => setFilters(prev => ({ ...prev, startDate: date }))}
              selectedDate={filters.startDate}
              placeholder="Start date"
            />
            
            <DatePicker
              onChange={date => setFilters(prev => ({ ...prev, endDate: date }))}
              selectedDate={filters.endDate}
              placeholder="End date"
            />
          </Flex>

          {/* Logs Table */}
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
              {logs.map((log, index) => (
                <Tr key={index}>
                  <Td>
                    <Typography>
                      {formatDate(new Date(log.createdAt), {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography>{log.action}</Typography>
                  </Td>
                  <Td>
                    <Typography>{log.content_type}</Typography>
                  </Td>
                  <Td>
                    <Typography>{log.record_id}</Typography>
                  </Td>
                  <Td>
                    <Typography>{log.user_email}</Typography>
                  </Td>
                  <Td>
                    <Typography>
                      {log.changes ? JSON.stringify(log.changes, null, 2) : '-'}
                    </Typography>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {/* Pagination */}
          <Box paddingTop={4}>
            <Pagination
              pageCount={Math.ceil(pagination.total / pagination.pageSize)}
              activePage={pagination.page}
              onPageChange={page => setPagination(prev => ({ ...prev, page }))}
            />
          </Box>
        </Box>
      </ContentLayout>
    </>
  );
};

export default AuditLogsPage;