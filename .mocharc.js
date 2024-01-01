module.exports = {
  color: true,
  bail: false,
  recursive: true,
  'watch-files': ['./{,!(node_modules)/**}/*.test.js'],
  package: './package.json',
  spec: ['./{,!(node_modules)/**}/*.test.js'],
  require: ['./test/globalFixture.js'],
  ignore: ['node_modules'],
  exit: true,
};
