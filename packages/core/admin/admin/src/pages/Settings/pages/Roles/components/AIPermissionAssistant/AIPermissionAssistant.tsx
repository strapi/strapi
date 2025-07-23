import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  TextInput,
  Typography,
  Loader,
  Tag,
  IconButton,
  Divider,
  Tabs,
} from '@strapi/design-system';
import { Sparkle, Play, Undo, Redo, Information, File } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useNotification } from '../../../../../../features/Notifications';

import { PermissionChangePreview } from './PermissionChangePreview';
import { generatePermissionChanges } from './utils/permissionChanges';

interface AIPermissionAssistantProps {
  permissions: any;
  layout: any;
  onApplyChanges: (changes: any) => void;
  roleId: string;
  roleName: string;
  currentDescription?: string;
  onDescriptionGenerated?: (description: string) => void;
}

// Type declaration for window.strapi
declare global {
  interface Window {
    strapi?: {
      env?: {
        STRAPI_ADMIN_AI_URL?: string;
        STRAPI_ADMIN_AI_API_KEY?: string;
      };
    };
  }
}

const EXAMPLE_COMMANDS = [
  'Give full access to all content types',
  'Remove delete permissions from all content types',
  'Allow viewing but not editing User',
  'Make address read-only for this role',
  'Make this role read-only for all content',
];

export const AIPermissionAssistant = ({
  permissions,
  layout,
  onApplyChanges,
  roleId,
  roleName,
  currentDescription,
  onDescriptionGenerated,
}: AIPermissionAssistantProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();

  // Debug layout on mount and extract content types immediately
  React.useEffect(() => {
    console.log('=== AI Permission Assistant Debug ===');
    console.log('Layout received:', layout);
    console.log('Layout type:', typeof layout);
    console.log('Layout keys:', layout ? Object.keys(layout) : 'layout is null/undefined');
    if (layout?.sections) {
      console.log('Sections keys:', Object.keys(layout.sections));
      console.log('CollectionTypes:', layout.sections.collectionTypes);
      console.log('SingleTypes:', layout.sections.singleTypes);

      // Test extraction immediately
      const testExtracted = extractContentTypes(layout);
      console.log('Test extraction result:', testExtracted);
    }
    console.log('=====================================');
  }, [layout]);

  const [command, setCommand] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [proposedChanges, setProposedChanges] = React.useState(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [commandHistory, setCommandHistory] = React.useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState(-1);
  const [activeTab, setActiveTab] = React.useState('permissions');
  const [generatedDescription, setGeneratedDescription] = React.useState(currentDescription || '');
  const [isGeneratingDescription, setIsGeneratingDescription] = React.useState(false);

  // Update generated description when currentDescription changes
  React.useEffect(() => {
    if (currentDescription) {
      setGeneratedDescription(currentDescription);
    }
  }, [currentDescription]);

  const handleProcessCommand = async () => {
    if (!command.trim()) return;

    setIsProcessing(true);
    setShowPreview(false);

    try {
      // Add to history
      setCommandHistory((prev) => [...prev, command]);
      setHistoryIndex(commandHistory.length);

      // Send to AI service for parsing
      const aiUrl = process.env.STRAPI_ADMIN_AI_URL || window.strapi?.env?.STRAPI_ADMIN_AI_URL;
      const aiKey =
        process.env.STRAPI_ADMIN_AI_API_KEY || window.strapi?.env?.STRAPI_ADMIN_AI_API_KEY;

      console.log('AI URL:', aiUrl);
      const extractedContentTypes = extractContentTypes(layout);
      const extractedPlugins = extractPlugins(layout);

      console.log('Extracted content types:', extractedContentTypes);
      console.log('Extracted plugins:', extractedPlugins);

      // Log each content type individually
      console.log('=== Content Types Detail ===');
      extractedContentTypes.forEach((ct) => {
        console.log(`- ${ct.uid} (${ct.displayName}) - ${ct.kind}`);
      });
      console.log('=========================');

      if (extractedContentTypes.length === 0) {
        console.error('No content types found in layout!');
        console.error('Layout structure:', layout);
      }

      console.log('Sending request with data:', {
        command,
        roleId,
        roleName,
        permissionCount: permissions?.length,
        contentTypes: extractedContentTypes,
        plugins: extractedPlugins,
      });

      // Log all collection type UIDs being sent
      console.log(
        'Collection type UIDs being sent:',
        extractedContentTypes.filter((ct) => ct.kind === 'collectionType').map((ct) => ct.uid)
      );

      if (!aiUrl || !aiKey) {
        console.warn('AI service not configured, using local fallback');
        throw new Error('AI service not configured');
      }

      const requestBody = {
        command,
        roleId,
        roleName,
        currentPermissions: permissions || [],
        availableContentTypes: extractedContentTypes,
        availablePlugins: extractedPlugins,
      };

      console.log('Sending request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${aiUrl}/permissions/parse-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error('AI service error:', response.status, response.statusText);
        throw new Error(`AI service error: ${response.status}`);
      }

      const result = await response.json();
      console.log('AI Response:', result);
      console.log('AI Interpretation targets:', result.interpretation?.targets);
      console.log('AI Interpretation actions:', result.interpretation?.permissions);

      if (result.error) {
        throw new Error(result.error);
      }

      // Generate permission changes based on AI interpretation
      const changes = generatePermissionChanges(permissions, result.interpretation, layout);

      console.log('Generated changes:', changes);
      console.log('Number of changes:', changes.length);

      // If we expected more changes, log why
      if (
        result.interpretation?.targets &&
        changes.length <
          result.interpretation.targets.length * (result.interpretation.permissions?.length || 1)
      ) {
        console.warn('Fewer changes generated than expected!');
        console.warn(
          'Expected at least:',
          result.interpretation.targets.length * (result.interpretation.permissions?.length || 1)
        );
        console.warn('Got:', changes.length);
      }

      if (changes.length === 0) {
        console.warn('No changes generated!');
        toggleNotification({
          type: 'warning',
          message: 'No permission changes were generated. Try a different command.',
        });
      } else {
        setProposedChanges({
          interpretation: result.interpretation,
          changes,
          summary: result.summary,
        });
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error processing command:', error);

      // Show error to user
      toggleNotification({
        type: 'danger',
        message:
          error instanceof Error
            ? error.message
            : 'Could not process the command. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyChanges = (selectedChanges: any[]) => {
    if (selectedChanges && selectedChanges.length > 0) {
      onApplyChanges(selectedChanges);
      toggleNotification({
        type: 'success',
        message: `Applied ${selectedChanges.length} permission change${selectedChanges.length !== 1 ? 's' : ''} successfully!`,
      });
      // Don't hide the preview so users can see what was applied
      // setShowPreview(false);
      // setCommand('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleProcessCommand();
    }

    // Command history navigation
    if (e.key === 'ArrowUp' && commandHistory.length > 0) {
      e.preventDefault();
      const newIndex = Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    }

    if (e.key === 'ArrowDown' && historyIndex < commandHistory.length - 1) {
      e.preventDefault();
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    }
  };

  const handleExampleClick = (example: string) => {
    setCommand(example);
  };

  const handleGenerateDescription = async () => {
    if (!roleName || !permissions) return;

    setIsGeneratingDescription(true);

    try {
      const aiUrl = process.env.STRAPI_ADMIN_AI_URL || window.strapi?.env?.STRAPI_ADMIN_AI_URL;
      const aiKey =
        process.env.STRAPI_ADMIN_AI_API_KEY || window.strapi?.env?.STRAPI_ADMIN_AI_API_KEY;

      if (!aiUrl || !aiKey) {
        throw new Error('AI service not configured');
      }

      const response = await fetch(`${aiUrl}/role-description/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiKey}`,
          'X-Strapi-Version': 'latest',
          'X-Strapi-User': 'unknown',
          'X-Strapi-Project-Id': 'unknown',
        },
        body: JSON.stringify({
          roleName: roleName,
          permissions: permissions,
        }),
      }).then((res) => res.json());

      if (response.description) {
        setGeneratedDescription(response.description);
        // Call the parent callback to update the description in the EditPage
        if (onDescriptionGenerated) {
          onDescriptionGenerated(response.description);
        }
        toggleNotification({
          type: 'success',
          message: 'Role description generated successfully',
        });
      } else {
        throw new Error('No description returned');
      }
    } catch (error) {
      console.error('Error generating description:', error);
      toggleNotification({
        type: 'danger',
        message: 'Failed to generate role description. Please try again.',
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  return (
    <Box background="neutral0" hasRadius shadow="filterShadow" padding={6}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between" alignItems="center">
          <Flex gap={2} alignItems="center">
            <Sparkle width={20} height={20} fill="primary600" />
            <Typography variant="beta" fontWeight="bold">
              AI Assistant
            </Typography>
          </Flex>
          <Tag icon={<Information />}>Alpha Demo</Tag>
        </Flex>

        <Tabs.Root defaultValue="permissions" value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List aria-label="AI Assistant features">
            <Tabs.Trigger value="permissions">
              <Flex gap={1} alignItems="center">
                <Play width={16} height={16} />
                Manage Permissions
              </Flex>
            </Tabs.Trigger>
            <Tabs.Trigger value="description">
              <Flex gap={1} alignItems="center">
                <File width={16} height={16} />
                Generate Description
              </Flex>
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="permissions">
            <Flex direction="column" alignItems="stretch" gap={4} paddingTop={4}>
              <Typography variant="pi" textColor="neutral600">
                Describe what permissions you want to change in plain English
              </Typography>

              <Box>
                <TextInput
                  placeholder="e.g., 'Give editors access to create and edit blog posts but not delete them'"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isProcessing}
                  endAction={
                    <Button
                      onClick={handleProcessCommand}
                      disabled={!command.trim() || isProcessing}
                      size="S"
                      startIcon={<Play />}
                      loading={isProcessing}
                      type="button"
                    >
                      {isProcessing ? 'Processing...' : 'Apply'}
                    </Button>
                  }
                />
              </Box>

              {/* Example commands */}
              <Box>
                <Typography variant="pi" textColor="neutral600">
                  Try these examples:
                </Typography>
                <Flex gap={2} wrap="wrap" marginTop={2}>
                  {EXAMPLE_COMMANDS.map((example, index) => (
                    <Button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      variant="tertiary"
                      size="S"
                      type="button"
                      style={{
                        whiteSpace: 'normal',
                        textAlign: 'left',
                        height: 'auto',
                        padding: '4px 12px',
                      }}
                    >
                      {example}
                    </Button>
                  ))}
                </Flex>
              </Box>

              {/* Preview changes */}
              {showPreview && proposedChanges && (
                <>
                  <Divider />
                  {console.log('Showing preview with:', proposedChanges)}
                  <PermissionChangePreview
                    changes={proposedChanges.changes || []}
                    interpretation={proposedChanges.interpretation}
                    summary={proposedChanges.summary}
                    onApply={handleApplyChanges}
                    onCancel={() => {
                      setShowPreview(false);
                      setCommand('');
                    }}
                    onClear={() => {
                      setShowPreview(false);
                      setProposedChanges(null);
                    }}
                  />
                </>
              )}
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="description">
            <Flex direction="column" alignItems="stretch" gap={4} paddingTop={4}>
              <Typography variant="pi" textColor="neutral600">
                Generate a description for this role based on its current permissions
              </Typography>

              <Button
                onClick={handleGenerateDescription}
                disabled={isGeneratingDescription}
                startIcon={<Sparkle />}
                loading={isGeneratingDescription}
                type="button"
              >
                {isGeneratingDescription ? 'Generating...' : 'Generate Description'}
              </Button>

              {generatedDescription && (
                <Box background="primary100" padding={4} hasRadius>
                  <Typography variant="pi" fontWeight="semiBold" textColor="primary700">
                    Generated Description:
                  </Typography>
                  <Typography variant="pi" marginTop={2}>
                    {generatedDescription}
                  </Typography>
                </Box>
              )}
            </Flex>
          </Tabs.Content>
        </Tabs.Root>
      </Flex>
    </Box>
  );
};

// Helper functions
const extractContentTypes = (layout: any) => {
  const contentTypes: any[] = [];

  console.log('=== extractContentTypes Debug ===');
  console.log('Layout:', layout);
  console.log('Layout type:', typeof layout);
  console.log('Layout is null?', layout === null);
  console.log('Layout is undefined?', layout === undefined);

  if (!layout) {
    console.error('Layout is null or undefined!');
    return contentTypes;
  }

  console.log('Top-level keys:', Object.keys(layout));

  // Try different possible structures
  // Structure 1: layout.sections
  if (layout.sections) {
    console.log('Found layout.sections');
    console.log('Sections keys:', Object.keys(layout.sections));
    console.log('Sections:', layout.sections);

    // Extract from collectionTypes
    if (layout.sections.collectionTypes) {
      console.log('CollectionTypes type:', typeof layout.sections.collectionTypes);
      console.log('CollectionTypes:', layout.sections.collectionTypes);

      if (
        layout.sections.collectionTypes.subjects &&
        Array.isArray(layout.sections.collectionTypes.subjects)
      ) {
        console.log(
          'Found collectionTypes.subjects array, length:',
          layout.sections.collectionTypes.subjects.length
        );
        layout.sections.collectionTypes.subjects.forEach((subject: any) => {
          console.log('Subject:', subject);
          if (subject.uid) {
            // Include ALL collection types, even plugin ones like users
            contentTypes.push({
              uid: subject.uid,
              displayName: subject.label || subject.uid.split('.').pop(),
              kind: 'collectionType',
            });
          }
        });
      }
    }

    // Extract from singleTypes
    if (layout.sections.singleTypes) {
      console.log('SingleTypes type:', typeof layout.sections.singleTypes);
      console.log('SingleTypes:', layout.sections.singleTypes);

      if (
        layout.sections.singleTypes.subjects &&
        Array.isArray(layout.sections.singleTypes.subjects)
      ) {
        console.log(
          'Found singleTypes.subjects array, length:',
          layout.sections.singleTypes.subjects.length
        );
        layout.sections.singleTypes.subjects.forEach((subject: any) => {
          contentTypes.push({
            uid: subject.uid,
            displayName: subject.label || subject.uid.split('.').pop(),
            kind: 'singleType',
          });
        });
      }
    }
  }

  // Structure 2: Direct collectionTypes/singleTypes
  if (layout.collectionTypes) {
    console.log('Found direct layout.collectionTypes');
    if (Array.isArray(layout.collectionTypes)) {
      layout.collectionTypes.forEach((ct: any) => {
        if (ct.uid) {
          // Include ALL collection types, even plugin ones
          contentTypes.push({
            uid: ct.uid,
            displayName: ct.info?.displayName || ct.label || ct.uid.split('.').pop(),
            kind: 'collectionType',
          });
        }
      });
    } else if (layout.collectionTypes.subjects) {
      layout.collectionTypes.subjects.forEach((subject: any) => {
        if (subject.uid) {
          // Include ALL collection types, even plugin ones
          contentTypes.push({
            uid: subject.uid,
            displayName: subject.label || subject.uid.split('.').pop(),
            kind: 'collectionType',
          });
        }
      });
    }
  }

  if (layout.singleTypes) {
    console.log('Found direct layout.singleTypes');
    if (Array.isArray(layout.singleTypes)) {
      layout.singleTypes.forEach((st: any) => {
        contentTypes.push({
          uid: st.uid,
          displayName: st.info?.displayName || st.label || st.uid.split('.').pop(),
          kind: 'singleType',
        });
      });
    } else if (layout.singleTypes.subjects) {
      layout.singleTypes.subjects.forEach((subject: any) => {
        contentTypes.push({
          uid: subject.uid,
          displayName: subject.label || subject.uid.split('.').pop(),
          kind: 'singleType',
        });
      });
    }
  }

  console.log('Final extracted content types:', contentTypes);
  console.log('Extraction complete, found:', contentTypes.length, 'content types');
  console.log('================================');

  return contentTypes;
};

const extractPlugins = (layout: any) => {
  const plugins: any[] = [];

  // Extract unique plugins from sections
  if (layout?.sections?.plugins) {
    // Get unique plugin names from the plugins array
    const uniquePlugins = new Set<string>();

    layout.sections.plugins.forEach((plugin: any) => {
      // Plugin structure has a plugin property
      if (plugin.plugin) {
        uniquePlugins.add(plugin.plugin);
      }
    });

    // Convert to array with proper format
    Array.from(uniquePlugins).forEach((pluginName) => {
      plugins.push({
        id: pluginName,
        displayName: pluginName
          .split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
      });
    });
  }

  console.log('Extracted plugins:', plugins);
  return plugins;
};
