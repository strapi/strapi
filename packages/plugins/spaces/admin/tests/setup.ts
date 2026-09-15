import { resetMine, server } from './server';

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  resetMine();
});

afterAll(() => {
  server.close();
});
