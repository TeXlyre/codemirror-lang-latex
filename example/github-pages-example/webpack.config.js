const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
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
      template: './src/index.html',
      filename: 'index.html'
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../../README.md'),
          to: 'README.md',
        },
      ],
    }),
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