import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  Typography,
  Badge,
  Grid,
  GridItem,
  Accordion,
  Checkbox,
} from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';

interface PermissionChange {
  type: 'add' | 'remove' | 'modify' | 'bulk';
  contentType?: string;
  plugin?: string;
  action: string;
  actions?: { action: string; type: 'add' | 'remove' | 'modify' }[]; // For bulk changes
  fields?: string[];
  conditions?: string[];
  displayName: string;
  before?: any;
  after?: any;
  id?: string;
}

interface PermissionChangePreviewProps {
  changes: PermissionChange[];
  interpretation: any;
  summary: string;
  onApply: (selectedChanges: PermissionChange[]) => void;
  onCancel: () => void;
  onClear?: () => void;
}

export const PermissionChangePreview = ({
  changes,
  interpretation,
  summary,
  onApply,
  onCancel,
  onClear,
}: PermissionChangePreviewProps) => {
  const { formatMessage } = useIntl();

  console.log('PermissionChangePreview received:', { changes, interpretation, summary });

  // Add IDs to changes and track selected state
  const changesWithIds = React.useMemo(() => {
    return changes.map((change, index) => ({
      ...change,
      id: `${change.type}-${change.contentType || change.plugin}-${change.action}-${index}`,
    }));
  }, [changes]);

  const [selectedChanges, setSelectedChanges] = React.useState<Set<string>>(
    new Set(changesWithIds.map((c) => c.id!))
  );

  const groupedChanges = React.useMemo(() => {
    const groups: Record<string, PermissionChange[]> = {
      contentTypes: [],
      plugins: [],
      settings: [],
    };

    changesWithIds.forEach((change) => {
      if (change.contentType) {
        groups.contentTypes.push(change);
      } else if (change.plugin) {
        groups.plugins.push(change);
      } else {
        groups.settings.push(change);
      }
    });

    return groups;
  }, [changesWithIds]);

  const getChangeBadgeColor = (type: string) => {
    switch (type) {
      case 'add':
        return 'success';
      case 'remove':
        return 'danger';
      case 'modify':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getBulkBadgeColor = (action: string) => {
    console.log('Badge action:', action); // Debug log
    switch (action) {
      case 'read-only':
        return 'warning';
      case 'full-access':
        return 'success';
      case 'grant':
        return 'success';
      case 'revoke':
        return 'danger';
      case 'modify':
        return 'warning';
      case 'no-change':
        return 'neutral';
      default:
        return 'neutral'; // Changed from 'primary' to match the neutral gray you're seeing
    }
  };

  const getBulkBadgeText = (action: string) => {
    switch (action) {
      case 'read-only':
        return 'READ-ONLY';
      case 'full-access':
        return 'FULL ACCESS';
      case 'grant':
        return 'GRANT';
      case 'revoke':
        return 'REVOKE';
      case 'modify':
        return 'MODIFY';
      case 'no-change':
        return 'NO CHANGE';
      default:
        return 'CHANGE';
    }
  };

  const handleToggleChange = (changeId: string) => {
    setSelectedChanges((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(changeId)) {
        newSet.delete(changeId);
      } else {
        newSet.add(changeId);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (selectedChanges.size === changesWithIds.length) {
      setSelectedChanges(new Set());
    } else {
      setSelectedChanges(new Set(changesWithIds.map((c) => c.id!)));
    }
  };

  const handleApply = () => {
    const selected = changesWithIds.filter((change) => selectedChanges.has(change.id!));
    onApply(selected);
  };

  const getPermissionLabel = (permission: string) => {
    // Map technical permission names to user-friendly labels
    const permissionMap: Record<string, string> = {
      create: 'Create',
      read: 'Read',
      find: 'View',
      findOne: 'View Details',
      update: 'Edit',
      delete: 'Delete',
      publish: 'Publish',
    };

    // Extract the permission type from the action string
    const parts = permission.split('.');
    const actionType = parts[parts.length - 1];

    return permissionMap[actionType] || actionType;
  };

  const renderChangeItem = (change: PermissionChange) => {
    const isSelected = selectedChanges.has(change.id!);

    // Handle bulk changes differently
    if (change.type === 'bulk' && change.actions) {
      // For bulk changes, show a summary of what will change
      const addActions = change.actions.filter((a) => a.type === 'add');
      const removeActions = change.actions.filter((a) => a.type === 'remove');
      const modifyActions = change.actions.filter((a) => a.type === 'modify');

      const summaryParts = [];

      // Create more descriptive summaries based on the actual permissions
      if (addActions.length > 0) {
        const addPerms = addActions.map((a) => {
          if (a.action.includes('.create')) return 'Create';
          if (a.action.includes('.read')) return 'View';
          if (a.action.includes('.update')) return 'Edit';
          if (a.action.includes('.delete')) return 'Delete';
          if (a.action.includes('.publish')) return 'Publish';
          return a.action.split('.').pop();
        });
        summaryParts.push(`Add: ${addPerms.join(', ')}`);
      }

      if (removeActions.length > 0) {
        const removePerms = removeActions.map((a) => {
          if (a.action.includes('.create')) return 'Create';
          if (a.action.includes('.read')) return 'View';
          if (a.action.includes('.update')) return 'Edit';
          if (a.action.includes('.delete')) return 'Delete';
          if (a.action.includes('.publish')) return 'Publish';
          return a.action.split('.').pop();
        });
        summaryParts.push(`Remove: ${removePerms.join(', ')}`);
      }

      if (modifyActions.length > 0) {
        summaryParts.push(
          `Modify ${modifyActions.length} permission${modifyActions.length > 1 ? 's' : ''}`
        );
      }

      return (
        <Box
          key={change.id}
          padding={3}
          background={isSelected ? 'primary100' : 'neutral100'}
          hasRadius
          marginBottom={2}
          style={{ cursor: 'pointer' }}
          onClick={() => handleToggleChange(change.id!)}
        >
          <Flex justifyContent="space-between" alignItems="flex-start">
            <Flex gap={3} alignItems="flex-start" style={{ flex: 1 }}>
              <Box onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  name={`change-${change.id}`}
                  checked={isSelected}
                  onCheckedChange={() => handleToggleChange(change.id!)}
                  aria-label={`Select ${change.displayName}`}
                />
              </Box>
              <Box style={{ flex: 1 }}>
                <Typography fontWeight="semiBold" marginRight={2}>
                  {change.displayName}
                </Typography>
                <Typography variant="pi" textColor="primary-100" marginTop={1}>
                  {summaryParts.join(' • ')}
                </Typography>
              </Box>
            </Flex>
            <Badge
              backgroundColor={`${getBulkBadgeColor(change.action)}100`}
              textColor={`${getBulkBadgeColor(change.action)}600`}
              borderColor={`${getBulkBadgeColor(change.action)}200`}
            >
              {getBulkBadgeText(change.action)}
            </Badge>
          </Flex>
        </Box>
      );
    }

    // Regular change rendering
    const permissionLabels =
      interpretation?.permissions?.map((p: string) => getPermissionLabel(p)).join(', ') ||
      getPermissionLabel(change.action);

    return (
      <Box
        key={change.id}
        padding={3}
        background={isSelected ? 'primary100' : 'neutral100'}
        hasRadius
        marginBottom={2}
        style={{ cursor: 'pointer' }}
        onClick={() => handleToggleChange(change.id!)}
      >
        <Flex justifyContent="space-between" alignItems="flex-start">
          <Flex gap={3} alignItems="flex-start" style={{ flex: 1 }}>
            <Box onClick={(e) => e.stopPropagation()}>
              <Checkbox
                name={`change-${change.id}`}
                checked={isSelected}
                onCheckedChange={() => handleToggleChange(change.id!)}
                aria-label={`Select ${change.displayName}`}
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Typography fontWeight="semiBold" marginRight={1}>
                {change.displayName}
              </Typography>
              <Typography variant="pi" textColor="neutral600" marginRight={4}>
                {change.contentType || change.plugin}
              </Typography>
              {change.fields && change.fields.length > 0 && (
                <Typography variant="pi" textColor="neutral500" marginTop={1}>
                  Fields: {change.fields.join(', ')}
                </Typography>
              )}
              {change.conditions && change.conditions.length > 0 && (
                <Typography variant="pi" textColor="warning600" marginTop={1}>
                  Conditions: {change.conditions.join(', ')}
                </Typography>
              )}
            </Box>
          </Flex>
          <Badge
            backgroundColor={`${getChangeBadgeColor(change.type)}100`}
            textColor={`${getChangeBadgeColor(change.type)}600`}
            borderColor={`${getChangeBadgeColor(change.type)}200`}
          >
            {change.type.toUpperCase()}
          </Badge>
        </Flex>
      </Box>
    );
  };

  return (
    <Box>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Box background="primary100" padding={4} hasRadius>
          <Typography variant="omega" fontWeight="semiBold" textColor="primary700" marginRight={1}>
            🤖 AI Understanding:
          </Typography>
          <Typography variant="pi" marginTop={1}>
            {summary}
          </Typography>
        </Box>

        <Flex justifyContent="space-between" alignItems="center">
          <Typography variant="beta" fontWeight="semiBold">
            Proposed Changes ({selectedChanges.size}/{changesWithIds.length} selected)
          </Typography>
          <Button variant="tertiary" size="S" onClick={handleToggleAll} type="button">
            {selectedChanges.size === changesWithIds.length ? 'Deselect All' : 'Select All'}
          </Button>
        </Flex>

        <Accordion.Root
          size="S"
          type="multiple"
          defaultValue={['contentTypes', 'plugins', 'settings']}
        >
          {groupedChanges.contentTypes.length > 0 && (
            <Accordion.Item value="contentTypes">
              <Accordion.Header>
                <Accordion.Trigger>
                  Content Types ({groupedChanges.contentTypes.length} changes)
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content>
                <Box padding={3}>{groupedChanges.contentTypes.map(renderChangeItem)}</Box>
              </Accordion.Content>
            </Accordion.Item>
          )}

          {groupedChanges.plugins.length > 0 && (
            <Accordion.Item value="plugins">
              <Accordion.Header>
                <Accordion.Trigger>
                  Plugins ({groupedChanges.plugins.length} changes)
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content>
                <Box padding={3}>{groupedChanges.plugins.map(renderChangeItem)}</Box>
              </Accordion.Content>
            </Accordion.Item>
          )}

          {groupedChanges.settings.length > 0 && (
            <Accordion.Item value="settings">
              <Accordion.Header>
                <Accordion.Trigger>
                  Settings ({groupedChanges.settings.length} changes)
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content>
                <Box padding={3}>{groupedChanges.settings.map(renderChangeItem)}</Box>
              </Accordion.Content>
            </Accordion.Item>
          )}
        </Accordion.Root>

        <Flex gap={2} justifyContent="space-between">
          <Box>
            {onClear && (
              <Button variant="tertiary" onClick={onClear} type="button">
                Clear Results
              </Button>
            )}
          </Box>
          <Flex gap={2}>
            <Button
              variant="default"
              startIcon={<Check />}
              onClick={handleApply}
              disabled={selectedChanges.size === 0}
              type="button"
            >
              Apply {selectedChanges.size} Selected Change{selectedChanges.size !== 1 ? 's' : ''}
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};
