const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../server'); // Importar app directamente

// Mock the reCAPTCHA client
jest.mock('@google-cloud/recaptcha-enterprise', () => ({
    RecaptchaEnterpriseServiceClient: jest.fn().mockImplementation(() => {
        const { MockRecaptchaClient } = require('../mocks/recaptcha.mock');
        return new MockRecaptchaClient();
    })
}));

describe('Integration Tests - /verify Endpoint', () => {
    test('should return JWT for valid token with high score', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                token: 'valid-token-success',
                recaptcha_action: 'send_email_form',
                user_ip: '192.168.1.100'
            })
            .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('score', 0.9);

        const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'test-secret-key-for-jest');
        expect(decoded).toHaveProperty('verified', true);
        expect(decoded).toHaveProperty('type', 'email_verification');
    });

    test('should return 400 for low score', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                token: 'valid-token-low-score',
                recaptcha_action: 'send_email_form',
                user_ip: '192.168.1.100'
            })
            .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('score', 0.3);
    });

    test('should return 400 for invalid token', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                token: 'invalid-token',
                recaptcha_action: 'send_email_form'
            })
            .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
    });

    test('should return 400 when token is missing', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                recaptcha_action: 'send_email_form'
            })
            .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'The "token" field is required');
    });

    test('should return 400 for wrong action', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                token: 'wrong-action',
                recaptcha_action: 'send_email_form'
            })
            .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for unexpected error', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                token: 'unexpected-error',
                recaptcha_action: 'send_email_form'
            })
            .expect(400);

        expect(response.body).toHaveProperty('success', false);
         expect(response.body).toHaveProperty('error', 'Internal error: Mock error: Unexpected token');
    });
});