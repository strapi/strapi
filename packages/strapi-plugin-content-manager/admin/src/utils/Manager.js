export default class Manager {
  constructor(state, list, keys, index, layout) {
    this.state = state;
    this.keys = keys.split('.');
    this.layout = layout;
    this.list = list;
    this.index = index;
    this.arrayOfEndLineElements = this.getLinesBound();
    this.attrToRemoveInfos = this.attrToRemoveInfos();
  }

  /**
   * Retrieve the bootstrap col index, name and type of a field
   * @param {Number} index 
   * @returns {Object}
   */
  getAttrInfos(index) {
    const name = this.getAttrName(index);
    const appearance = this.layout.getIn([name, 'appearance']);
    const type = appearance !== '' && appearance !== undefined ? appearance : this.getType(name);
    const bootstrapCol = this.getBootStrapCol(type);

    const infos = {
      bootstrapCol,
      index,
      name,
      type,
    };

    return infos;
  }

  /**
   * Retrieve a field default bootstrap col
   * NOTE: will change if we add the customisation of an input's width
   * @param {String} type 
   * @returns {Number}
   */
  getBootStrapCol(type) {
    switch(type) {
      case 'checkbox':
      case 'boolean':
        return 3;
      case 'date':
        return 4;
      case 'json':
      case 'wysiwyg':
      case 'WYSIWYG':
        return 12;
      default:
        return 6;
    }
  }

  /**
   * Retrieve the field to remove infos
   * @returns {Object}
   */
  attrToRemoveInfos() {
    return this.getAttrInfos(this.index);
  }

  /**
   * 
   * Retrieve the last element of each bootstrap line
   * @returns {Array}
   */
  getLinesBound() { // NOTE: doesn't work for the last element if the line is not full!
    const array = [];
    let sum = 0;

    this.list.forEach((item, i) => {
      let { bootstrapCol, index, name, type } = this.getAttrInfos(i);

      if (!type && name.includes('__col')) {
        bootstrapCol = parseInt(name.split('__')[1].split('-')[2], 10);
      }

      sum += bootstrapCol;

      if (sum === 12 || bootstrapCol === 12) {
        const isFullSize = bootstrapCol === 12;
        array.push({ name, index, isFullSize });
        sum = 0;
      }

      if (sum > 12) {
        sum = 0;
      }

      if (i < this.list.size - 1) {
        let { bootstrapCol: nextBootstrapCol, name: nextName, type: nextType } = this.getAttrInfos(i + 1);
        
        if (!nextType && nextName.includes('__col')) {
          nextBootstrapCol = parseInt(nextName.split('__')[1].split('-')[2], 10);
        }

        if (sum + nextBootstrapCol > 12) {
          const isFullSize = bootstrapCol === 12;
          array.push({ name, index, isFullSize });
          sum = 0;
        }
      }
    });

    return array;
  }

  /**
   * 
   * Retrieve the field's type depending on its name
   * @param {String} itemName 
   * @returns {String}
   */
  getType(itemName) {
    return this.state
      .getIn(['modifiedSchema', 'models', ...this.keys, 'availableFields', itemName, 'type']);
  }

  /**
   * Retrieve a field name depending on its index
   * @param {Number} itemIndex
   * @returns {String}
   */
  getAttrName(itemIndex){
    return this.state
      .getIn(['modifiedSchema', 'models', ...this.keys, 'fields', itemIndex]);
  }

  /**
   * Retrieves the studiedField's line boostrap col length
   * @param {Number} leftBound 
   * @param {Number} rightBound 
   * @returns {Number}
   */
  getLineColSize(leftBound, rightBound) {
    const start = leftBound === 0 ? 1 : leftBound;

    return this.list
      .slice(start, rightBound)
      .reduce((acc, current) => {
        const appearance = this.layout.getIn([current, 'appearance']);
        const type = appearance !== '' && appearance !== undefined ? appearance : this.getType(current);
        const col = this.getBootStrapCol(type);

        return acc += col;
      }, 0);
  }

  /**
   * 
   * @param {Bool} dir sup or min
   * @param {Number} pivot the center
   * @returns {Object} the first sup or last sup
   */
  getBound(dir, pivot = this.index) {
    let result = {};
    let hasResult = false;

    this.arrayOfEndLineElements.forEach(item => {
      const cond = dir === true ? item.index >= pivot && !hasResult : item.index <= pivot;

      if (cond) {
        hasResult = true;
        result = item;
      }
    });

    return result;
  }
}