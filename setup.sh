#!/bin/bash

# Create necessary directories
mkdir -p grammar
mkdir -p scripts
mkdir -p src

# Copy grammar files if they exist
if [ -f "latex.grammar" ]; then
  cp latex.grammar grammar/
  echo "Copied latex.grammar to grammar/"
fi

if [ -f "tokens.mjs" ]; then
  cp tokens.mjs grammar/
  echo "Copied tokens.mjs to grammar/"
fi

# Copy generate-parser.cjs to scripts directory
if [ ! -f "scripts/generate-parser.cjs" ]; then
  echo "Creating scripts/generate-parser.cjs"
  cat > scripts/generate-parser.cjs << 'EOF'
// Script to generate the Lezer parser from grammar files

const { buildParserFile } = require('@lezer/generator');
const fs = require('fs');
const path = require('path');

// Paths
const GRAMMAR_FILE = path.join(__dirname, '../grammar/latex.grammar');
const TOKENS_FILE = path.join(__dirname, '../grammar/tokens.mjs');
const OUTPUT_DIR = path.join(__dirname, '../src');

async function generateParser() {
  console.log('Generating parser from grammar...');

  try {
    // Ensure the grammar directory exists in the source tree
    if (!fs.existsSync(GRAMMAR_FILE)) {
      console.error(`Grammar file not found: ${GRAMMAR_FILE}`);
      process.exit(1);
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Read the grammar file
    const grammarContent = fs.readFileSync(GRAMMAR_FILE, 'utf8');

    // Build the parser
    const result = buildParserFile(grammarContent, {
      moduleStyle: 'es',
      moduleSourcePath: './grammar/latex.grammar',
      exportName: 'parser',
      warn: warning => console.warn(warning)
    });

    // Write output files
    const parserOutputPath = path.join(OUTPUT_DIR, 'latex.mjs');
    const termsOutputPath = path.join(OUTPUT_DIR, 'latex.terms.mjs');

    fs.writeFileSync(parserOutputPath, result.parser);
    fs.writeFileSync(termsOutputPath, result.terms);

    // Copy the tokens file to the output directory
    const tokensOutputPath = path.join(OUTPUT_DIR, 'tokens.mjs');
    fs.copyFileSync(TOKENS_FILE, tokensOutputPath);

    console.log('Parser generated successfully:');
    console.log(`- Parser: ${parserOutputPath}`);
    console.log(`- Terms: ${termsOutputPath}`);
    console.log(`- Tokens: ${tokensOutputPath}`);
  } catch (error) {
    console.error('Error generating parser:', error);
    process.exit(1);
  }
}

// Run the generator
generateParser();
EOF
fi

echo "Setup complete. You can now run: npm install"