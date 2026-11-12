export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // config-conventional defaults header-max-length to 100; this repo allows 120.
    'header-max-length': [2, 'always', 120],
    'body-max-line-length': [2, 'always', 100],
  },
};
