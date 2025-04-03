// example/bundled-example/webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  devServer: {
    static: './dist',
    hot: true,
    port: 3000
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    })
  ],
  resolve: {
    // This will help webpack find the extension in the parent directory
    modules: [
      'node_modules',
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, '../..')
    ],
    // Add this to ensure single instance of codemirror modules
    alias: {
      '@codemirror/state': path.resolve(__dirname, '../../node_modules/@codemirror/state'),
      '@codemirror/view': path.resolve(__dirname, '../../node_modules/@codemirror/view'),
      '@codemirror/language': path.resolve(__dirname, '../../node_modules/@codemirror/language'),
      '@codemirror/autocomplete': path.resolve(__dirname, '../../node_modules/@codemirror/autocomplete'),
      '@codemirror/lint': path.resolve(__dirname, '../../node_modules/@codemirror/lint'),
      '@lezer/common': path.resolve(__dirname, '../../node_modules/@lezer/common'),
      '@lezer/lr': path.resolve(__dirname, '../../node_modules/@lezer/lr'),
      '@lezer/highlight': path.resolve(__dirname, '../../node_modules/@lezer/highlight')
    }
  }
};