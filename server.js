const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(express.json());
app.use(cors()); // Puedes restringir a los dominios que consuman este servicio

// Cliente de reCAPTCHA (se crea una sola vez y se reutiliza)
let client;
try {
    client = new RecaptchaEnterpriseServiceClient();
} catch (err) {
    console.error('❌ Error al inicializar el cliente de reCAPTCHA:', err.message);
    process.exit(1);
}

const projectID = process.env.PROJECT_ID;
const recaptchaKey = process.env.RECAPTCHA_KEY;

if (!projectID || !recaptchaKey) {
    console.error('❌ Faltan variables PROJECT_ID o RECAPTCHA_KEY en el .env');
    process.exit(1);
}

const projectPath = client.projectPath(projectID);

/**
 * Endpoint para verificar un token de reCAPTCHA
 * POST /verify
 * Body (JSON):
 *   - token (obligatorio): el token generado por el frontend
 *   - recaptchaAction (opcional, por defecto "send_email_form"): acción esperada
 *   - userIp (opcional): IP del usuario
 *   - userAgent (opcional): User-Agent del navegador
 *   - ja4 (opcional): huella JA4
 *   - ja3 (opcional): huella JA3
 *
 * Respuesta:
 *   - success: boolean (indica si la verificación fue exitosa y el score >= umbral)
 *   - score: número (0.0 - 1.0)
 *   - valid: boolean (si el token es válido y la acción coincide)
 *   - reasons: array de motivos (si los hay)
 *   - error: string (en caso de error)
 */
app.post('/verify', async (req, res) => {
    const {
        token,
        recaptchaAction = 'send_email_form',
        userIp,
        userAgent = 'unknown',
        ja4 = '',
        ja3 = ''
    } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'El campo "token" es requerido' });
    }

    try {
        // Construir la solicitud de assessment (igual que en tu código original)
        const request = {
            assessment: {
                event: {
                    token,
                    siteKey: recaptchaKey,
                    userIpAddress: userIp || req.ip || '',
                    userAgent,
                    ja4,
                    ja3,
                },
            },
            parent: projectPath,
        };

        const [response] = await client.createAssessment(request);

        // 1. Validar el token
        if (!response.tokenProperties.valid) {
            const invalidReason = response.tokenProperties.invalidReason || 'unknown';
            console.log(`❌ Token inválido: ${invalidReason}`);
            return res.json({
                success: false,
                valid: false,
                score: 0,
                reasons: [invalidReason],
                error: 'Token inválido'
            });
        }

        // 2. Validar la acción
        if (response.tokenProperties.action !== recaptchaAction) {
            console.log(`❌ Acción esperada "${recaptchaAction}" pero recibió "${response.tokenProperties.action}"`);
            return res.json({
                success: false,
                valid: false,
                score: response.riskAnalysis?.score || 0,
                reasons: ['La acción no coincide con la esperada'],
                error: 'Acción incorrecta'
            });
        }

        // 3. Obtener el score y razones
        const score = response.riskAnalysis?.score || 0;
        const reasons = response.riskAnalysis?.reasons || [];

        console.log(`✅ Score: ${score}, Razones: ${reasons.join(', ') || 'ninguna'}`);

        // Decidir si es exitoso según umbral (0.5) - pero devolvemos toda la info
        const success = score >= 0.5;

        return res.json({
            success,
            valid: true,
            score,
            reasons,
        });

    } catch (error) {
        console.error('❌ Error en createAssessment:', error.message);
        return res.status(500).json({
            error: 'Error interno al verificar reCAPTCHA',
            details: error.message
        });
    }
});

// Endpoint de salud (health check)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'recaptcha' });
});

// Iniciar servidor
app.listen(port, '127.0.0.1', () => {
    console.log(`✅ Microservicio reCAPTCHA corriendo en http://127.0.0.1:${port}`);
    console.log(`   Proyecto: ${projectID}`);
    console.log(`   Key: ${recaptchaKey}`);
});