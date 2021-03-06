import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';

const pkg = require('./package.json');
const external = Object.keys(pkg.dependencies);

export default {
  entry: 'src/index.js',
  plugins: [
    babel(babelrc())
  ],
  external: external,
  targets: [{
    dest: 'dist/bundles/index.js',
    format: 'umd',
    moduleName: 'Babelute',
    sourceMap: true
  }, {
    dest: 'dist/bundles/index.mjs',
    format: 'es',
    sourceMap: true
  }]
};

