#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pagesDir = path.join(__dirname, '../example/github-pages-example');

// Create the directory if it doesn't exist
if (!fs.existsSync(pagesDir)) {
  fs.mkdirSync(pagesDir, { recursive: true });
  console.log(`Created directory: ${pagesDir}`);
}

// Create src directory
const srcDir = path.join(pagesDir, 'src');
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
  console.log(`Created directory: ${srcDir}`);
}

// Install dependencies
try {
  console.log('Installing dependencies for the GitHub Pages example...');
  process.chdir(pagesDir);
  execSync('npm install', { stdio: 'inherit' });
  console.log('Dependencies installed successfully.');
} catch (error) {
  console.error('Failed to install dependencies:', error);
  process.exit(1);
}

console.log('\nGitHub Pages example setup complete!');
console.log('To start the GitHub Pages example locally, run:');
console.log('cd example/github-pages-example && npm start');