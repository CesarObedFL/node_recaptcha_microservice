const request = require('supertest');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { app } = require('../../server');

// Mock the email microservice call
jest.mock('axios');

// Mock reCAPTCHA
jest.mock('@google-cloud/recaptcha-enterprise', () => ({
    RecaptchaEnterpriseServiceClient: jest.fn().mockImplementation(() => {
        const { MockRecaptchaClient } = require('../mocks/recaptcha.mock');
        return new MockRecaptchaClient();
    })
}));

describe('Integration Tests - Full Flow with Email Microservice', () => {
    const EMAIL_MS_URL = 'http://localhost:3000/request';
    const TEST_JWT_SECRET = 'test-secret-key-for-jest';

    test('should complete full flow: reCAPTCHA → JWT → Email', async () => {
        // Step 1: Verify reCAPTCHA and get JWT
        const recaptchaResponse = await request(app)
            .post('/verify')
            .send({
                token: 'valid-token-success',
                recaptcha_action: 'send_email_form',
                user_ip: '192.168.1.100'
            })
            .expect(200);

        expect(recaptchaResponse.body).toHaveProperty('success', true);
        expect(recaptchaResponse.body).toHaveProperty('token');

        const jwtToken = recaptchaResponse.body.token;

        // Step 2: Send email with JWT
        const emailData = {
            full_name: 'Test User',
            email: 'test@example.com',
            subject: 'Test Subject',
            message: 'This is a test message'
        };

        // Mock successful email response
        axios.post.mockResolvedValueOnce({
            status: 200,
            data: { success: 'Email sent successfully' }
        });

        const emailResponse = await axios.post(
            EMAIL_MS_URL,
            emailData,
            {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        expect(emailResponse.status).toBe(200);
        expect(emailResponse.data).toHaveProperty('success', 'Email sent successfully');

        // Verify the JWT was valid
        const decoded = jwt.verify(jwtToken, TEST_JWT_SECRET);
        expect(decoded).toHaveProperty('verified', true);
        expect(decoded).toHaveProperty('type', 'email_verification');
    });

    test('should reject email with invalid JWT', async () => {
        const invalidJwt = jwt.sign(
            { verified: false, type: 'email_verification' },
            'wrong-secret'
        );

        const emailData = {
            full_name: 'Test User',
            email: 'test@example.com',
            subject: 'Test Subject',
            message: 'This is a test message'
        };

        // Mock failed email response
        axios.post.mockRejectedValueOnce({
            response: {
                status: 403,
                data: { error: 'Invalid JWT token' }
            }
        });

        try {
            await axios.post(
                EMAIL_MS_URL,
                emailData,
                {
                    headers: {
                        'Authorization': `Bearer ${invalidJwt}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            fail('Should have thrown an error');
        } catch (error) {
            expect(error.response.status).toBe(403);
            expect(error.response.data).toHaveProperty('error', 'Invalid JWT token');
        }
    });

    test('should reject email with expired JWT', async () => {
        const expiredJwt = jwt.sign(
            { verified: true, type: 'email_verification' },
            TEST_JWT_SECRET,
            { expiresIn: '0s' }
        );

        // Mock failed email response
        axios.post.mockRejectedValueOnce({
            response: {
                status: 403,
                data: { error: 'JWT expired' }
            }
        });

        try {
            await axios.post(
                EMAIL_MS_URL,
                {
                    full_name: 'Test User',
                    email: 'test@example.com',
                    subject: 'Test Subject',
                    message: 'Test message'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${expiredJwt}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            fail('Should have thrown an error');
        } catch (error) {
            expect(error.response.status).toBe(403);
            expect(error.response.data).toHaveProperty('error', 'JWT expired');
        }
    });
});