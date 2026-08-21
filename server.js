const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fetch = require ('node-fetch');
const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');

/**
 * Loads environment variables from the .env file
 */
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3100;

/**
 * Middleware to parse JSON and enable CORS
 */
app.use(express.json());
app.use(cors());

/**
 * @var {string} project_id - Google Cloud project ID
 */
const project_id = process.env.PROJECT_ID;

/**
 * @var {string} recaptcha_key - Site key for reCAPTCHA Enterprise
 */
const recaptcha_key = process.env.RECAPTCHA_KEY;

/**
 * @var {string} jwt_secret - Secret key for signing JWTs (must match the email microservice)
 */
const jwt_secret = process.env.JWT_SECRET;

/**
 * @var {string}  -  (must match the email microservice)
 */
const emailMicroserviceUrl = process.env.EMAIL_MICROSERVICE_URL || 'http://localhost:3000';

/**
 * Verifies that all required environment variables are defined
 * 
 * @throws {Error} If any critical variable is missing
 */
if (!project_id) {
    console.error('❌ Error: PROJECT_ID is not defined in the .env file');
    process.exit(1);
}

if (!recaptcha_key) {
    console.error('❌ Error: RECAPTCHA_KEY is not defined in the .env file');
    process.exit(1);
}

if (!jwt_secret) {
    console.error('❌ Error: JWT_SECRET is not defined in the .env file');
    console.error('⚠️  It must match the JWT_SECRET used in the emailing microservice');
    process.exit(1);
}

/**
 * Singleton instance of the reCAPTCHA Enterprise client
 * 
 * A single instance is created and reused for all requests
 * to optimize performance and prevent memory leaks.
 * 
 * @var {RecaptchaEnterpriseServiceClient} recaptcha_client
 */
let recaptcha_client;

try {
    recaptcha_client = new RecaptchaEnterpriseServiceClient();
} catch (error) {
    console.error('❌ Error initializing reCAPTCHA client:', error.message);
    process.exit(1);
}

/**
 * Google Cloud project path
 * 
 * @var {string} project_path
 */
const project_path = recaptcha_client.projectPath(project_id);

/**
 * Creates an assessment in reCAPTCHA Enterprise
 * 
 * This function encapsulates the token verification logic
 * and handles all possible error cases.
 * 
 * @param {Object} params - Assessment parameters
 * @param {string} params.token - reCAPTCHA token from the frontend
 * @param {string} params.recaptcha_action - Expected action (e.g., "send_email_form")
 * @param {string} params.user_ip - User's IP address
 * @param {string} params.user_agent - Browser's User-Agent
 * @param {string} params.ja4 - JA4 fingerprint (optional)
 * @param {string} params.ja3 - JA3 fingerprint (optional)
 * 
 * @returns {Promise<Object>} Assessment result
 * @returns {boolean} return.valid - Indicates if the token is valid
 * @returns {number} return.score - Risk score (0.0 - 1.0)
 * @returns {Array<string>} return.reasons - Score reasons
 * @returns {string|null} return.error - Error message if any
 * 
 * @throws {Error} If an error occurs during Google Cloud communication
 */
async function create_assessment({
    token,
    recaptcha_action = 'send_email_form',
    user_ip = '',
    user_agent = 'unknown',
    ja4 = '',
    ja3 = ''
}) {
    // Validate that the token is present
    if (!token) {
        return {
            valid: false,
            score: 0,
            reasons: [],
            error: 'Token is required'
        };
    }

    try {
        // Build the assessment request
        const request = {
            assessment: {
                event: {
                    token: token,
                    siteKey: recaptcha_key,
                    userIpAddress: user_ip,
                    userAgent: user_agent,
                    ja4: ja4,
                    ja3: ja3,
                },
            },
            parent: project_path,
        };

        // Perform the assessment
        const [response] = await recaptcha_client.createAssessment(request);

        // Check if the token is valid
        if (!response.tokenProperties.valid) {
            const invalid_reason = response.tokenProperties.invalidReason || 'unknown';
            console.log(`❌ Invalid token: ${invalid_reason}`);
            
            return {
                valid: false,
                score: 0,
                reasons: [invalid_reason],
                error: `Invalid token: ${invalid_reason}`
            };
        }

        // Verify that the action matches
        if (response.tokenProperties.action !== recaptcha_action) {
            console.log(`❌ Expected action "${recaptcha_action}" but received "${response.tokenProperties.action}"`);
            
            return {
                valid: false,
                score: response.riskAnalysis?.score || 0,
                reasons: ['Action does not match the expected one'],
                error: 'Incorrect action'
            };
        }

        // Get the score and reasons
        const score = response.riskAnalysis?.score || 0;
        const reasons = response.riskAnalysis?.reasons || [];

        console.log(`✅ Assessment successful - Score: ${score}, Reasons: ${reasons.join(', ') || 'none'}`);

        return {
            valid: true,
            score: score,
            reasons: reasons,
            error: null
        };

    } catch (error) {
        console.error('❌ Error in create_assessment:', error.message);
        
        return {
            valid: false,
            score: 0,
            reasons: [],
            error: `Internal error: ${error.message}`
        };
    }
}

// API ENDPOINTS

/**
 * reCAPTCHA verification endpoint
 * 
 * POST /verify
 * 
 * @route POST /verify
 * @param {Object} req.body - Request body
 * @param {string} req.body.token - reCAPTCHA token (required)
 * @param {string} req.body.recaptcha_action - Expected action (optional, default: "send_email_form")
 * @param {string} req.body.user_ip - User's IP address (optional)
 * @param {string} req.body.user_agent - User-Agent (optional)
 * @param {string} req.body.ja4 - JA4 fingerprint (optional)
 * @param {string} req.body.ja3 - JA3 fingerprint (optional)
 * 
 * @returns {Object} JSON response
 * @returns {boolean} success - Indicates if verification was successful and JWT was generated
 * @returns {number} score - reCAPTCHA score
 * @returns {Array} reasons - Score reasons
 * @returns {string} error - Error message (only if success = false)
 */
app.post('/verify', async (req, res) => {
    console.log('📩 Petición recibida en /verify');

    // Extraer datos del cuerpo de la petición (incluyen los del formulario)
    const {
        token,
        recaptcha_action = 'send_email_form',
        user_ip,
        user_agent = 'unknown',
        ja4 = '',
        ja3 = '',
        full_name,
        email: clientEmail,
        subject,
        message
    } = req.body;

    // Validar que el token esté presente
    if (!token) {
        console.warn('⚠️ Petición sin token');
        return res.status(400).json({
            success: false,
            error: 'El campo "token" es requerido'
        });
    }

    // Validar que los datos del formulario estén completos
    if (!full_name || !clientEmail || !subject || !message) {
        console.warn('⚠️ Faltan datos del formulario');
        return res.status(400).json({
            success: false,
            error: 'Los campos full_name, email, subject y message son requeridos'
        });
    }

    try {
        // 1. Realizar la evaluación de reCAPTCHA
        const assessment_result = await create_assessment({
            token: token,
            recaptcha_action: recaptcha_action,
            user_ip: user_ip || req.ip || '',
            user_agent: user_agent,
            ja4: ja4,
            ja3: ja3
        });

        // 2. Verificar si la evaluación fue válida
        if (!assessment_result.valid) {
            console.warn('⚠️ Evaluación de reCAPTCHA fallida:', assessment_result.error);
            return res.status(400).json({
                success: false,
                error: assessment_result.error || 'Verificación de reCAPTCHA fallida',
                score: assessment_result.score,
                reasons: assessment_result.reasons
            });
        }

        const score = assessment_result.score;

        // 3. Verificar que la puntuación sea suficiente (umbral: 0.5)
        if (score < 0.5) {
            console.warn(`⚠️ Puntuación baja: ${score} (umbral: 0.5)`);
            return res.status(400).json({
                success: false,
                error: 'Puntuación de reCAPTCHA demasiado baja (umbral mínimo: 0.5)',
                score: score,
                reasons: assessment_result.reasons
            });
        }

        // 4. Generar JWT (ya que la verificación fue exitosa)
        const jwt_payload = {
            verified: true,
            type: 'email_verification'
        };

        const jwt_token = jwt.sign(
            jwt_payload,
            jwt_secret,
            { expiresIn: '5m' } // El token expira en 5 minutos por seguridad
        );

        console.log(`✅ Verificación exitosa - Score: ${score}, JWT generado`);

        // =============================================================
        // 5. NUEVO: Llamar al microservicio de email con el JWT
        // =============================================================
        const emailPayload = {
            full_name,
            email: clientEmail,
            subject,
            message
        };

        console.log(`📤 Enviando petición al microservicio de email: ${emailMicroserviceUrl}/request`);

        const emailResponse = await fetch(`${emailMicroserviceUrl}/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt_token}`
            },
            body: JSON.stringify(emailPayload)
        });

        // Leer la respuesta del microservicio de email
        const emailResult = await emailResponse.json();

        if (!emailResponse.ok) {
            // Si el email microservice devuelve un error, lo propagamos
            console.error('❌ Error del microservicio de email:', emailResult);
            return res.status(emailResponse.status).json({
                success: false,
                error: emailResult.error || 'Error al enviar el correo',
                details: emailResult
            });
        }

        // 6. Todo fue bien: devolver éxito al frontend (sin JWT)
        console.log('✅ Correo enviado exitosamente a través del microservicio de email');
        return res.json({
            success: true,
            message: 'Mensaje enviado correctamente'
        });

    } catch (error) {
        console.error('❌ Error en /verify:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Error interno al procesar la solicitud',
            details: error.message
        });
    }
});

/**
 * Health check endpoint
 * 
 * GET /health
 * 
 * @route GET /health
 * @returns {Object} Service status
 * @returns {string} status - Service status ("ok")
 * @returns {string} service - Service name ("recaptcha")
 * 
 * @example
 * GET /health
 * 
 * // Response
 * {
 *   "status": "ok",
 *   "service": "recaptcha"
 * }
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'recaptcha'
    });
});

/**
 * Configuration endpoint (service information)
 * 
 * GET /config
 * 
 * @route GET /config
 * @returns {Object} Service configuration
 * @returns {number} port - Port where the service is running
 */
app.get('/config', (req, res) => {
    res.json({
        port: port
    });
});

/**
 * Exporta la aplicación y funciones para pruebas
 */
module.exports = {
  app,
  create_assessment
};

// =========================================================================
// INICIO DEL SERVIDOR (SOLO SI NO ESTÁ EN MODO PRUEBA)
// =========================================================================
if (require.main === module && process.env.NODE_ENV !== 'test') {
  app.listen(port, '127.0.0.1', () => {
    console.log('========================================');
    console.log('✅ reCAPTCHA Microservice');
    console.log(`📡 Port: ${port}`);
    console.log(`📁 Project: ${project_id}`);
    console.log(`🔑 JWT Secret: ${jwt_secret ? 'defined ✅' : 'not defined ❌'}`);
    console.log('========================================');
    console.log(`🌐 Server running at http://127.0.0.1:${port}`);
    console.log(`🔗 Available endpoints:`);
    console.log(`   POST /verify   - Verify reCAPTCHA token and generate JWT`);
    console.log(`   GET  /health   - Health check`);
    console.log(`   GET  /config   - Service configuration`);
    console.log('========================================');
  });
}

// TERMINATION SIGNAL HANDLING

/**
 * Handles SIGTERM signal for graceful shutdown
 * 
 * @param {string} signal - Received signal
 */
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM signal received. Shutting down server...');
    process.exit(0);
});

/**
 * Handles SIGINT signal (Ctrl+C)
 * 
 * @param {string} signal - Received signal
 */
process.on('SIGINT', () => {
    console.log('🛑 SIGINT signal received. Shutting down server...');
    process.exit(0);
});