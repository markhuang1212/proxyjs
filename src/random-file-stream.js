const { Readable } = require('stream')

class RandomFileStream extends Readable {
    constructor(options) {
        super(options)
    }
    _read(size) {
        this.push('a'.repeat(size/2))
    }
}

module.exports = RandomFileStream