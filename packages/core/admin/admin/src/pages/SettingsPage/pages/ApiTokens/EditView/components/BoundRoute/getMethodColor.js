const getMethodColor = (verb) => {
  switch (verb) {
    case 'POST': {
      return {
        text: 'success600',
        border: 'success200',
        background: 'success100',
      };
    }
    case 'GET': {
      return {
        text: 'secondary600',
        border: 'secondary200',
        background: 'secondary100',
      };
    }
    case 'PUT': {
      return {
        text: 'warning600',
        border: 'warning200',
        background: 'warning100',
      };
    }
    case 'DELETE': {
      return {
        text: 'danger600',
        border: 'danger200',
        background: 'danger100',
      };
    }
    default: {
      return {
        text: 'neutral600',
        border: 'neutral200',
        background: 'neutral100',
      };
    }
  }
};

export default getMethodColor;
