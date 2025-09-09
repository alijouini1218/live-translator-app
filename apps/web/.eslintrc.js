module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  rules: {
    // Disable specific rules that might be causing issues
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'react/no-unescaped-entities': 'off',
    'react-hooks/exhaustive-deps': 'warn',
  },
}