import * as React from 'react';

import { Flex, Button, Typography } from '@strapi/design-system';

const NpsSurvey = () => {
  const [surveyIsShown, setSurveyIsShown] = React.useState(true);

  if (!surveyIsShown) {
    return null;
  }

  const handleSubmitResponse = () => {
    setSurveyIsShown(false);
  };

  const handleDismiss = () => {
    setSurveyIsShown(false);
  };

  return (
    <Flex gap={2} padding={2}>
      <Typography>NPS SURVEY</Typography>
      <Button onClick={handleDismiss}>Dismiss</Button>
      <Button onClick={handleSubmitResponse}>Submit</Button>
    </Flex>
  );
};

export default NpsSurvey;
