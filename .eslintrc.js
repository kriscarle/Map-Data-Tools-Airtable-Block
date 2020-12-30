module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: ['standard', 'standard-react'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: ['react', 'react-hooks'],
  rules: {
    'react/prop-types': 0,
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    camelcase: 'off',
    'object-curly-spacing': 'off',
    'standard/object-curly-even-spacing': [2, 'either'],
    'react/jsx-handler-names': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}
