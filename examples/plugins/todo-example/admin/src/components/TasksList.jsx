import * as React from 'react';
import styled from 'styled-components';
import { Box, Flex, Checkbox, IconButton, Typography } from '@strapi/design-system';
import { Trash, Pencil } from '@strapi/icons';
import TaskModal from './TaskModal';
import { useFetchClient } from '@strapi/strapi/admin';

const Wrapper = styled(Flex)`
  min-height: 2rem;

  > :last-child {
    visibility: hidden;
  }

  &:hover {
    > :last-child {
      visibility: visible;
    }
  }
`;

const TasksList = ({ tasks, status, refetchTasks, isCreatingEntry }) => {
  const [taskBeingEdited, setTaskBeingEdited] = React.useState(null);
  const fetchClient = useFetchClient();

  const toggleTask = async (documentId, isChecked) => {
    // Update task in database
    await fetchClient.put(`/todo/tasks/${documentId}`, {
      isDone: isChecked,
    });

    // Call API to update local cache
    await refetchTasks();
  };

  const openEditModal = async (documentId) => {
    setTaskBeingEdited(documentId);
  };

  const deleteTask = async (documentId) => {
    await fetchClient.del(`/todo/tasks/${documentId}`);
    await refetchTasks();
  };

  // Disabled
  if (isCreatingEntry) {
    return (
      <Box paddingTop={6} color="neutral600" textAlign="center">
        <Typography variant="omega">Save your entry to start managing todos.</Typography>
      </Box>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <Box paddingTop={6} color="neutral600" textAlign="center">
        Fetching todos...
      </Box>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Box paddingTop={6} color="danger600" textAlign="center">
        Could not fetch tasks.
      </Box>
    );
  }

  // Empty state
  if (tasks == null || tasks.length === 0) {
    return (
      <Box paddingTop={6} color="neutral600" textAlign="center">
        No todo yet.
      </Box>
    );
  }

  // Success state, show all tasks
  return (
    <>
      <TaskModal
        key={taskBeingEdited || 'edit'}
        action="edit"
        handleClose={() => setTaskBeingEdited(null)}
        refetchTasks={refetchTasks}
        task={tasks.find((task) => task.documentId === taskBeingEdited)}
        isOpen={taskBeingEdited !== null}
      />

      {tasks.map((task) => (
        <Wrapper justifyContent="space-between" key={task.documentId}>
          <Checkbox
            checked={task.isDone}
            onCheckedChange={(checked) => toggleTask(task.documentId, checked)}
          >
            <span
              style={{
                textDecoration: task.isDone ? 'line-through' : 'none',
                display: 'inline-block',
                transform: 'translateY(-1px)',
              }}
            >
              {task.name}
            </span>
          </Checkbox>
          <Flex direction={'row'} justifyContent="flex-end" gap={2}>
            <IconButton label="Edit" onClick={() => openEditModal(task.documentId)}>
              <Pencil />
            </IconButton>
            <IconButton label="Delete" onClick={() => deleteTask(task.documentId)}>
              <Trash />
            </IconButton>
          </Flex>
        </Wrapper>
      ))}
    </>
  );
};

export default TasksList;
