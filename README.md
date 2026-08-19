# Node ReCAPTCHA Microservice

> A secure microservice for Google ReCAPTCHA Enterprise verification that issues JWT tokens upon successful validation, designed to integrate seamlessly with email and other services.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-blue)](https://pnpm.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()

## 🚀 Overview

This microservice acts as a verification gateway for Google reCAPTCHA Enterprise. It validates user interactions, assesses risk scores, and issues signed JWT tokens that can be used by other services (such as an email microservice) to authenticate legitimate requests.

The service is designed with **security**, **scalability**, and **separation of concerns** in mind, making it an ideal component for microservices architectures.

### Key Benefits

- **🛡️ Spam Protection**: Prevents automated abuse with configurable score thresholds
- **🔐 Secure Authentication**: Issues JWT tokens for secure service-to-service communication
- **⚡ High Performance**: Singleton client pattern for optimal performance
- **🔒 Enterprise-grade**: Uses Google's reCAPTCHA Enterprise for reliable risk assessment

## ✨ Features

| Feature | Description |
|---------|-------------|
| **🔐 reCAPTCHA Enterprise Integration** | Verifies tokens using Google's reCAPTCHA Enterprise API |
| **🎯 Risk Assessment** | Returns risk scores (0.0 - 1.0) with detailed reasons |
| **🔑 JWT Token Generation** | Issues signed JWT tokens for successful verifications |
| **🛡️ Spam Protection** | Configurable score threshold (default: 0.5) |
| **📊 Comprehensive Logging** | Detailed logging for debugging and monitoring |
| **⚡ High Performance** | Singleton client pattern for optimal performance |
| **🔒 CORS Support** | Restricts access to trusted origins |
| **📦 Lightweight** | Minimal dependencies for fast startup |
| **🧪 Test Ready** | Comprehensive test suite with Jest and Supertest |
| **🐳 Docker Ready** | Easy containerization for consistent deployments |

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | >= 18.0.0 | Required for native fetch and modern features |
| **pnpm** | >= 8.0.0 | Optional (npm/yarn also supported) |
| **Google Cloud Account** | - | With reCAPTCHA Enterprise enabled |
| **Service Account** | - | With the "reCAPTCHA Enterprise Agent" role |

## 🔧 Installation

### From GitHub (Development)

## Clone the repository

```
git clone https://github.com/CesarObedFL/node_recaptcha_microservice.git
cd node_recaptcha_microservice
```

# Install dependencies

`pnpm install`

or

`npm install`

### ⚙️ Configuration
1. Environment Variables
Copy the example environment file and update with your values:

`cp .env.example .env`
2. Configure .env File

```
# Server Configuration
PORT=3100

# CORS Configuration
CLIENT_URL=https://your-frontend-domain.com

# Google Cloud Platform
PROJECT_ID=your-google-cloud-project-id

# reCAPTCHA Enterprise
RECAPTCHA_KEY=your-recaptcha-site-key

# Google Application Credentials
GOOGLE_APPLICATION_CREDENTIALS=./config/credentials.json

# JWT Configuration (Must match email microservice)
JWT_SECRET=your-super-secret-jwt-key
```

3. Set Up Google Cloud Credentials
- Go to Google Cloud Console
- Navigate to IAM & Admin > Service Accounts
- Create a new service account with the "reCAPTCHA Enterprise Agent" role
- Generate a JSON key and download it
- Place the JSON file in the config/ directory
- Update GOOGLE_APPLICATION_CREDENTIALS with the correct path

4. Generate a Secure JWT Secret

### Using OpenSSL (Linux/Mac)
`openssl rand -base64 32`

### Using Node.js
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### Using Python
`python3 -c "import secrets; print(secrets.token_urlsafe(32))"`

## 🚀 Usage

Development Mode

### With pnpm
`pnpm run dev`

### With npm
`npm run dev`

The server will start with auto-reload enabled via nodemon.

Production Mode

### With pnpm
`pnpm start`

### With npm

`npm start`

Using PM2 (Recommended for Production)

## Install PM2 globally
npm install -g pm2

### Start the service
`pm2 start server.js --name recaptcha-microservice`

### View logs
`pm2 logs recaptcha-microservice`

### Monitor status
`pm2 status`

### Stop the service
`pm2 stop recaptcha-microservice`

# Restart the service
`pm2 restart recaptcha-microservice`

📡 API Endpoints

POST /verify
Verifies a reCAPTCHA token and returns a JWT if successful.

Request Headers:

text
Content-Type: application/json
Request Body:

json
{
  "token": "03AFcWeA5p2...",           // Required - reCAPTCHA token from frontend
  "recaptcha_action": "send_email_form", // Optional - Default: "send_email_form"
  "user_ip": "192.168.1.100",          // Optional - User's IP address
  "user_agent": "Mozilla/5.0...",      // Optional - Browser user agent
  "ja4": "fingerprint",                // Optional - JA4 fingerprint
  "ja3": "fingerprint"                 // Optional - JA3 fingerprint
}
Successful Response (200):

json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "score": 0.9,
  "reasons": []
}
Failed Response - Low Score (400):

json
{
  "success": false,
  "error": "reCAPTCHA score is too low (minimum threshold: 0.5)",
  "score": 0.3,
  "reasons": ["SUSPICIOUS"]
}
Failed Response - Invalid Token (400):

json
{
  "success": false,
  "error": "Invalid token: TOKEN_EXPIRED",
  "score": 0,
  "reasons": ["TOKEN_EXPIRED"]
}
Error Response (500):

json
{
  "success": false,
  "error": "Internal error verifying reCAPTCHA",
  "details": "Error message here"
}

GET /health
Health check endpoint to verify service status.

Response (200):

json
{
  "status": "ok",
  "service": "recaptcha"
}

GET /config
Returns the current service configuration (public information only).

Response (200):

json
{
  "port": 3100,
  "project_id": "project-id",
  "jwt_secret_status": "defined"
}

## 🔄 Integration with Email Microservice
This microservice is designed to work seamlessly with the Email Microservice.

Complete Flow:
Frontend → Get reCAPTCHA token from user
Frontend → Send token to /verify endpoint
This Service → Validate with Google → Generate JWT
This Service → Return JWT to frontend
Frontend → Send JWT + email data to email microservice
Email Microservice → Validate JWT → Send email

Example Implementation:
javascript
// Frontend code example
async function submitForm(formData) {
  // Step 1: Verify reCAPTCHA
  const recaptchaToken = await grecaptcha.enterprise.execute('site-key', {
    action: 'send_email_form'
  });
  
  // Step 2: Get JWT from reCAPTCHA microservice
  const verificationResponse = await fetch('http://localhost:3100/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: recaptchaToken,
      recaptcha_action: 'send_email_form',
      user_ip: userIP
    })
  });
  
  const { success, token } = await verificationResponse.json();
  
  if (!success) {
    throw new Error('reCAPTCHA verification failed');
  }
  
  // Step 3: Send email with JWT
  const emailResponse = await fetch('http://localhost:3000/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      full_name: formData.name,
      email: formData.email,
      subject: formData.subject,
      message: formData.message
    })
  });
  
  return await emailResponse.json();
}

## 🧪 Testing
Running Tests

### Run all tests with coverage
`npm test`

### Run only unit tests
`npm run test:unit`

### Run only integration tests
`npm run test:email`

### Run tests in watch mode
`npm run test:watch`

### Generate coverage report
`npm run test:coverage`


The test suite covers:

- ✅ Token validation (valid, invalid, expired)
- ✅ Score thresholds (high score, low score)
- ✅ Action verification (correct, incorrect)
- ✅ JWT generation and validation
- ✅ Full flow with email microservice
- ✅ Error handling (missing token, server errors)


## ☕ Support the Project

If you find this project useful, you can buy me a coffee to keep it going!

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/lato-orange.png)](https://buymeacoffee.com/cesarobedfl)

<b>Follow me! </b> <br>
<p align="left">
    <a href="https://github.com/CesarObedFL">
        <img src="https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
    </a>
    <a href="https://www.linkedin.com/in/cesarobedfigueroaluna/">
        <img src="https://img.shields.io/badge/linkedin-%230077B5.svg?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
    </a>
</p>

## 🤝 Contributing
Contributions are welcome! Please follow these steps:
- Development Guidelines
- Follow the existing code style
- Write clear commit messages
- Update documentation when needed
- Add tests for new features
- Ensure all tests pass before submitting PR

## 🔗 Related Projects
Email Microservice - Companion service for sending emails with JWT authentication

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

Made with ❤️ by Cesar Obed FL