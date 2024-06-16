module.exports = {
    rules: [{
      loader: 'babel-loader',
      test: /.*/,
      exclude: /public\/raw\/.*/
    }]
}