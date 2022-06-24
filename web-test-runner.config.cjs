process.env.NODE_ENV = 'test';

/** @type {import('@web/test-runner').TestRunnerConfig} */
const config = {
  plugins: [require('@snowpack/web-test-runner-plugin')()],
  testFramework: {
    config: {
      ui: 'tdd',
    },
  },
};

module.exports = config;
