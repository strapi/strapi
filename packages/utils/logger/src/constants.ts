import { config } from 'winston';

const LEVELS = config.npm.levels;
const LEVEL_LABEL = 'silly';
const LEVEL = LEVELS[LEVEL_LABEL];

export { LEVEL, LEVEL_LABEL, LEVELS };
