// @HichamELBSI, @mfrachet if you have a better naming for our components and fields
// store I will be happy to change the current name
import Components from './Components';
import Fields from './Fields';

class Library {
  constructor() {
    this.components = Components();
    this.fields = Fields();
  }
}

export default () => new Library();
