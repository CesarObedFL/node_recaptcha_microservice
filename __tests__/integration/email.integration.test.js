const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../server');

// Mock del cliente de reCAPTCHA
jest.mock('@google-cloud/recaptcha-enterprise', () => ({
    RecaptchaEnterpriseServiceClient: jest.fn().mockImplementation(() => {
        const { MockRecaptchaClient } = require('../mocks/recaptcha.mock');
        return new MockRecaptchaClient();
    })
}));

describe('Integration Tests - Full Flow with Email Microservice', () => {

    const FORM_DATA = {
        full_name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'This is a test message'
    };

    test('should complete full flow: reCAPTCHA → Email', async () => {
        // Enviar la petición al reCAPTCHA MS, que orquestará la llamada al email MS
        const recaptchaResponse = await request(app)
            .post('/verify')
            .send({
                token: 'valid-token-success',
                recaptcha_action: 'send_email_form',
                user_ip: '192.168.1.100',
                ...FORM_DATA
            })
            .expect(200);

        // El reCAPTCHA MS devuelve éxito, no JWT
        expect(recaptchaResponse.body).toHaveProperty('success', true);
        expect(recaptchaResponse.body).toHaveProperty('message', 'Mensaje enviado correctamente');
        expect(recaptchaResponse.body).not.toHaveProperty('token');
    });

    // Test para cuando el email MS falla (se puede simular con un mock)
    test('should return error when email microservice fails', async () => {
        // Este test requeriría mockear el fetch al email MS
        // Por ahora, lo dejamos pendiente
    });
});