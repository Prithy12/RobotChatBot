const path = require('path');

module.exports = {
  mode: 'production',
  entry: path.join(__dirname, 'src', 'preload.js'),
  output: {
    filename: 'preload.bundle.js',
    path: path.join(__dirname, 'dist'),
  },
  target: 'electron-preload',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.json']
  }
};