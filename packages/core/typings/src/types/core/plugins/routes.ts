import type { Common } from '../..';

// TODO: Do we actually need to allow a function that returns routes like the core router?
export type Routes = Common.RouteInput[] | (() => Common.RouteInput[]);
