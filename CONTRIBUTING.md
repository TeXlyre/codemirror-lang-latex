# Contributing to CodeMirror 6 LaTeX Language Support

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/texlyre/codemirror-lang-latex.git
   cd codemirror-lang-latex
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

4. Run the webpack example:
   ```
   npm run setup-example
   npm run example
   ```

5. Run the GitHub Pages example:
   ```
   npm run setup-pages-example
   npm run pages-example
   ```

## Project Structure

- `grammar/` - Contains the LaTeX grammar files used to generate the parser
- `src/` - Source code for the CodeMirror extension
- `example/` - Contains example applications showing the extension in use
- `scripts/` - Utility scripts for building and generating files
- `dist/` - Build output (generated)

## Making Changes

1. Create a new branch for your changes:
   ```
   git checkout -b feature/your-feature-name
   ```

2. Make your changes to the codebase.

3. Build the project to ensure your changes compile:
   ```
   npm run build
   ```

4. Test your changes using the example application:
   ```
   npm run example
   ```

5. Commit your changes with a clear and descriptive commit message.

6. Push your branch to your fork:
   ```
   git push origin feature/your-feature-name
   ```

7. Create a pull request to the main repository.

## Coding Guidelines

- Follow the existing code style in the project
- Write clear, documented code
- Add comments for complex functionality
- Update documentation when necessary

## Pull Request Process

1. Ensure your code builds without errors
2. Update the README.md with details of changes if appropriate
3. Your pull request will be reviewed by the maintainers
4. Address any requested changes

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).