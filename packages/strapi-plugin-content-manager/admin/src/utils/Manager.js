export default class Manager {
	constructor(state, list, keys, index) {
		this.state = state;
		this.keys = keys.split('.');
		this.list = list;
		this.index = index;
		this.arrayOfEndLineElements = this.getLinesBound();
	}

	/**
	 * Retrieve the bootstrap col index, name and type of a field
	 * @param {Number} index 
	 * @returns {Object}
	 */
	getAttrInfos(index) {
		const name = this.getAttrName(index);
		const type = this.getType(name);
		const boostrapCol = this.getBootStrapCol(type);

		const infos = {
			boostrapCol,
			index,
			name,
			type,
		}

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
			return 12;
			default:
			return 6;
		}
	};

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
			// Retrieve the item's bootstrap col
			// Similutes the layout that is not in the core store yet
			const { /*bootstrapCol, */ index, name, /* type */ } = this.getAttrInfos(i); // TODO: use these variables when layout in core store
			const type = item.includes('long') ? 'wysiwyg' : this.getType(item);
			const boostrapCol = this.getBootStrapCol(type);

			sum += boostrapCol;

			if (sum === 12 || boostrapCol === 12) {
				const isFullSize = boostrapCol === 12;
				array.push({ name, index, isFullSize });
				sum + 0;
			}

			if (sum > 12) {
				sum = 0;
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
	};

	/**
	 * Retrieving : (end of prev line < studiedField < end of prev Line)
	 * @param {Number} leftBound 
	 * @param {Number} rightBound 
	 * @returns {Number}
	 */
	getLineColSize(leftBound, rightBound) {
		return this.list
			.slice(leftBound + 1, rightBound)
			.reduce((acc, current) => {
				const type = this.getType(current);
				// Simulates the layout => NEEDS TO BE REMOVED
				const col = current.includes('long') ? 12 : this.getBootStrapCol(type);

				return acc += col;
			}, 0);
	}
}