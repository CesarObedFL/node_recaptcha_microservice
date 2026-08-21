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

describe('Integration Tests - /verify Endpoint', () => {

    // DATOS BASE DEL FORMULARIO
    const FORM_DATA = {
        full_name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'This is a test message'
    };

    test('should return 200 and send email for valid token with high score', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                token: 'valid-token-success',
                recaptcha_action: 'send_email_form',
                user_ip: '192.168.1.100',
                ...FORM_DATA
            })
            .expect(200);

        // El endpoint ahora devuelve éxito sin JWT
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message', 'Mensaje enviado correctamente');
        // No debe devolver token
        expect(response.body).not.toHaveProperty('token');
    });

    test('should return 400 for low score', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                token: 'valid-token-low-score',
                recaptcha_action: 'send_email_form',
                user_ip: '192.168.1.100',
                ...FORM_DATA
            })
            .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Puntuación de reCAPTCHA demasiado baja (umbral mínimo: 0.5)');
        expect(response.body).toHaveProperty('score', 0.3);
    });

    test('should return 400 for invalid token', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                token: 'invalid-token',
                recaptcha_action: 'send_email_form',
                ...FORM_DATA
            })
            .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Invalid token: TOKEN_EXPIRED');
    });

    test('should return 400 when token is missing', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                recaptcha_action: 'send_email_form',
                ...FORM_DATA
            })
            .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'El campo "token" es requerido');
    });

    test('should return 400 for wrong action', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                token: 'wrong-action',
                recaptcha_action: 'send_email_form',
                ...FORM_DATA
            })
            .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Incorrect action');
    });

    test('should return 400 when form data is missing', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                token: 'valid-token-success',
                recaptcha_action: 'send_email_form',
                // Faltan full_name, email, subject, message
            })
            .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Los campos full_name, email, subject y message son requeridos');
    });

    test('should return 400 for unexpected error from reCAPTCHA', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                token: 'unexpected-error',
                recaptcha_action: 'send_email_form',
                ...FORM_DATA
            })
            .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Internal error: Mock error: Unexpected token');
    });
});