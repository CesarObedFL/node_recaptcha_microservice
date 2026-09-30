// ecosystem.config.js
require('dotenv').config(); // Carga el .env en el proceso de PM2

module.exports = {
  apps: [
    {
      name: 'recaptcha-microservice',
      script: 'service.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT,
        CLIENT_URL: process.env.CLIENT_URL,
        PROJECT_ID: process.env.PROJECT_ID,
        RECAPTCHA_KEY: process.env.RECAPTCHA_KEY,
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        JWT_SECRET: process.env.JWT_SECRET,
        EMAIL_MICROSERVICE_URL: process.env.EMAIL_MICROSERVICE_URL,
      }
    }
  ]
};