#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Make setup-pages-example.cjs executable
const setupScript = path.join(__dirname, 'setup-pages-example.cjs');
fs.chmodSync(setupScript, '755');
console.log(`Made ${setupScript} executable`);