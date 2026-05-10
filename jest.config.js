module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // Avoid matching arbitrary files named `test.js` (e.g. src/constants/test.js).
  testMatch: ['**/*.test.js', '**/*.spec.js'],
};
