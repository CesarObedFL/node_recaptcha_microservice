const dotenv = require('dotenv');
const path = require('path');

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

console.log('🧪 Setting up test environment...');

// Usar el mismo puerto que el servicio real (3100)
process.env.PORT = '3100';
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.PROJECT_ID = 'test-project-id';
process.env.RECAPTCHA_KEY = 'test-recaptcha-key';
process.env.GOOGLE_APPLICATION_CREDENTIALS = './config/test-credentials.json';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test'; // Importante: evitar que el servidor se inicie

// Increase timeout for async tests
jest.setTimeout(15000);

// node-fetch mock
jest.mock('node-fetch', () => jest.fn());

// Mock global de fetch para todas las pruebas
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: 'Email sent successfully' })
    })
);

beforeEach(() => {
    const fetch = require('node-fetch');
    fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: 'Email sent successfully' })
    });
});