module.exports = {
  apps: [
    {
      name: 'doska-app',
      script: 'server.ts',
      interpreter: 'node',
      node_args: '--import tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
