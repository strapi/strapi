// import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(...[]);
