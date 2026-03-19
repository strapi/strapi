import { Timer } from './timer';

export class TimerFactory {
  create() {
    return new Timer();
  }
}
