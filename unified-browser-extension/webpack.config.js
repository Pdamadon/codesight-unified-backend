const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
require('dotenv').config({ path: '.env.local' });

module.exports = {
  entry: {
    background: './background.js',
    'content-script': './content-script.js',
    popup: './popup.js',
    options: './options.js',
    'injected-script': './injected-script.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BACKEND_URL': JSON.stringify(process.env.BACKEND_URL),
      'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL),
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.EXTENSION_VERSION': JSON.stringify(process.env.EXTENSION_VERSION),
      'process.env.EXTENSION_NAME': JSON.stringify(process.env.EXTENSION_NAME)
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'popup.html', to: 'popup.html' },
        { from: 'options.html', to: 'options.html' },
        { from: 'icons', to: 'icons' },
        { 
          from: 'README.md', 
          to: 'README.md',
          noErrorOnMissing: true 
        }
      ]
    })
  ],
  resolve: {
    fallback: {
      "path": false,
      "os": false,
      "crypto": false,
      "fs": false
    }
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: process.env.NODE_ENV === 'production' ? false : 'cheap-module-source-map'
};