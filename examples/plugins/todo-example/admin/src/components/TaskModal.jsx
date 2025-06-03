import * as React from 'react';
import { Modal, Typography, Button, TextInput } from '@strapi/design-system';
import {
  unstable_useContentManagerContext as useContentManagerContext,
  useFetchClient,
} from '@strapi/strapi/admin';

const TaskModal = ({ handleClose, refetchTasks, task = null, action, isOpen }) => {
  const [name, setName] = React.useState(task?.name ?? '');
  const [status, setStatus] = React.useState('');
  const fetchClient = useFetchClient();

  const { id, model } = useContentManagerContext();

  const handleSubmit = async (e) => {
    // Prevent submitting parent form
    e.preventDefault();
    e.stopPropagation();

    try {
      // Show loading state
      setStatus('loading');

      if (action === 'create') {
        // Create task and link it to the related entry
        await fetchClient.post('/todo/tasks', {
          name,
          isDone: false,
          related: {
            __type: model,
            id,
          },
        });
      } else if (action === 'edit') {
        // Update task
        await fetchClient.put(`/todo/tasks/${task.documentId}`, {
          name,
        });
      }

      // Refetch tasks list so it includes up to date data
      await refetchTasks();

      // Remove loading and close popup
      setStatus('success');
      setName('');

      handleClose();
    } catch (e) {
      setStatus('error');
    }
  };

  const getError = () => {
    // Form validation error
    if (name.length > 40) {
      return 'Content is too long';
    }
    // API error
    if (status === 'error') {
      return 'Could not create todo';
    }
    return null;
  };

  return (
    <Modal.Root
      open={isOpen}
      onOpenChange={() => {
        handleClose();
      }}
    >
      <Modal.Content aria-labelledby="title">
        <Modal.Header>
          <Typography fontWeight="bold" textColor="neutral800" tag="h2" id="title">
            {action === 'create' && 'Add todo'}
            {action === 'edit' && 'Edit todo'}
          </Typography>
        </Modal.Header>
        <Modal.Body>
          <TextInput
            placeholder="What do you need to do?"
            aria-label="Task name"
            name="text"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
          {getError()}
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button onClick={handleClose} variant="tertiary">
              Cancel
            </Button>
          </Modal.Close>
          <Button type="submit" disabled={status === 'loading'} onClick={handleSubmit}>
            {status === 'loading' ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export default TaskModal;
