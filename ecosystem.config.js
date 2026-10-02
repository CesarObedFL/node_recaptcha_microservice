module.exports = {
  apps: [
    {
      name: 'recaptcha_microservice',
      script: 'server.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
        PROJECT_ID: "portfolio-1737941968535",
        RECAPTCHA_KEY: "6LdbU8QqAAAAAPs_wi4YwxISP5TjY1mkBOqEbC29",
        GOOGLE_APPLICATION_CREDENTIALS: "/var/www/node_recaptcha_microservice/config/portfolio-1737941968535-8fa0f2fd5504.json"
      }
    }
  ]
};