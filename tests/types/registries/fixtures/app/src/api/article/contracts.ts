// A contract shared by several modules. The API loader does not read this file: it only loads the
// API's index and its config, routes, controllers, services, policies, middlewares and
// content-types, so a contract file inside `services/` would register a service.
export type StatsContract = {
  total(): Promise<number>;
};
