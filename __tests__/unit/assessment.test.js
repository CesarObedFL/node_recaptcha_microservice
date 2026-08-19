const { MockRecaptchaClient } = require('../mocks/recaptcha.mock');

// Mock the entire google-cloud module
jest.mock('@google-cloud/recaptcha-enterprise', () => ({
    RecaptchaEnterpriseServiceClient: jest.fn().mockImplementation(() => {
        return new MockRecaptchaClient();
    })
}));

const { create_assessment } = require('../../server');

describe('Unit Tests - Assessment Functions', () => {
    // Los tests permanecen igual, pero ahora create_assessment está definido
    test('should return success with high score for valid token', async () => {
        const result = await create_assessment({
            token: 'valid-token-success',
            recaptcha_action: 'send_email_form',
            user_ip: '192.168.1.100'
        });

        expect(result).toHaveProperty('valid', true);
        expect(result).toHaveProperty('score', 0.9);
        expect(result).toHaveProperty('reasons');
        expect(result).toHaveProperty('error', null);
    });

    test('should return failure for low score token', async () => {
        const result = await create_assessment({
            token: 'valid-token-low-score',
            recaptcha_action: 'send_email_form',
            user_ip: '192.168.1.100'
        });

        expect(result).toHaveProperty('valid', true);
        expect(result).toHaveProperty('score', 0.3);
        expect(result.reasons).toContain('SUSPICIOUS');
    });

    test('should return failure for invalid token', async () => {
        const result = await create_assessment({
            token: 'invalid-token',
            recaptcha_action: 'send_email_form',
            user_ip: '192.168.1.100'
        });

        expect(result).toHaveProperty('valid', false);
        expect(result).toHaveProperty('score', 0);
        expect(result).toHaveProperty('error');
        expect(result.error).toContain('Invalid token');
    });

    test('should return failure for wrong action', async () => {
        const result = await create_assessment({
            token: 'wrong-action',
            recaptcha_action: 'send_email_form',
            user_ip: '192.168.1.100'
        });

        expect(result).toHaveProperty('valid', false);
        expect(result).toHaveProperty('error');
        expect(result.error).toContain('Incorrect action');
    });

    test('should return error when token is missing', async () => {
        const result = await create_assessment({
            token: null,
            recaptcha_action: 'send_email_form'
        });

        expect(result).toHaveProperty('valid', false);
        expect(result).toHaveProperty('error', 'Token is required');
    });
});