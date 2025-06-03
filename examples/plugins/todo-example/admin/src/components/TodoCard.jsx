import * as React from 'react';
import { Box, Divider, Flex, TextButton, Typography } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/strapi/admin';
import TaskModal from './TaskModal';
import useRelatedTasks from '../hooks/useRelatedTasks';
import TasksList from './TasksList';

const TodoCard = () => {
  const [createModalIsShown, setCreateModalIsShown] = React.useState(false);
  const { status, tasks, refetchTasks } = useRelatedTasks();

  const { isCreatingEntry } = useContentManagerContext();

  return (
    <React.Fragment>
      <TaskModal
        action="create"
        handleClose={() => setCreateModalIsShown(false)}
        refetchTasks={refetchTasks}
        isOpen={createModalIsShown}
      />
      <Box
        aria-labelledy="additional-informations"
        background="neutral0"
        marginTop={4}
        width={'100%'}
      >
        <Typography variant="sigma" textColor="neutral600" id="additional-informations">
          Todos
        </Typography>
        <Box paddingTop={2} paddingBottom={6}>
          <Box paddingBottom={2}>
            <Divider />
          </Box>
          <Flex paddingTop={2} justifyContent="space-between">
            <TextButton
              startIcon={<Plus />}
              onClick={() => setCreateModalIsShown(true)}
              disabled={isCreatingEntry}
            >
              <Typography variant="omega" textColor={isCreatingEntry ? 'neutral600' : 'primary600'}>
                Add todo
              </Typography>
            </TextButton>
            <Typography textColor="neutral600" variant="omega" padding={3}>
              {tasks.filter((task) => task.isDone).length}/{tasks.length}
            </Typography>
          </Flex>
          <Box paddingTop={2}>
            <TasksList
              status={status}
              tasks={tasks}
              refetchTasks={refetchTasks}
              isCreatingEntry={isCreatingEntry}
            />
          </Box>
        </Box>
      </Box>
    </React.Fragment>
  );
};

export default TodoCard;
