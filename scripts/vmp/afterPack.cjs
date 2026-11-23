const { vmpSign } = require('./vmp.cjs')
exports.default = async (context) => vmpSign('afterPack', context)
