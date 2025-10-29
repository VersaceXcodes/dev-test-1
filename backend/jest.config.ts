module.exports = {
  "testEnvironment": "node",
  "testMatch": [
    "**/__tests__/**/*.js",
    "**/?(*.)+(spec|test).js"
  ],
  "setupFilesAfterEnv": [
    "./test/setup.js"
  ],
  "globals": {
    "ts-jest": {
      "babelConfig": true
    }
  },
  "collectCoverageFrom": [
    "src/**/*.{js,ts}"
  ],
  "coverageReporters": [
    "json",
    "lcov",
    "text"
  ],
  "preset": "ts-jest"
};