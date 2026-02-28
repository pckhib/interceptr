export default {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ['@semantic-release/npm', { pkgRoot: 'apps/server' }],
    '@semantic-release/github',
  ],
};
