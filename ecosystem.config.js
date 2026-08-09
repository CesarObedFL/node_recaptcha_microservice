// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'recaptcha-microservice',
      script: 'service.js',
      watch: false,
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
      }
    }
  ]
};