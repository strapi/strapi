import { previewScript } from './script';

const scriptResponse = previewScript(false);

export const EVENTS = scriptResponse!.EVENTS;
