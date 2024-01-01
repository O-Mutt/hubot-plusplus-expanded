module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    '**/*.test.*',
    'test/**/*',
  ],
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
  },
  rules: {
    'no-restricted-syntax': 'off',
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'max-len': [
      'warn',
      {
        code: 180,
        ignoreComments: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    'no-plusplus': 'off',
  },
  overrides: [
    {
      env: {
        mocha: true,
      },
      plugins: ['mocha'],
      files: ['*.test.*', '**/*.test.*'],
      rules: {
        'no-unused-expressions': 'off',
        'jest/no-setup-in-describe': 'warn',
        'no-console': 'off',
      },
    },
  ],
};
