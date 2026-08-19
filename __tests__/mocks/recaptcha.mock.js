class MockRecaptchaClient {
  constructor() {
    this.projectPath = jest.fn((projectId) => `projects/${projectId}`);
  }

  /**
   * Mock createAssessment method
   * 
   * @param {Object} request - Assessment request
   * @returns {Promise<Array>} Mock response
   */
  async createAssessment(request) {
    const token = request.assessment.event.token;

    // Simulate different responses based on token
    if (token === 'valid-token-success') {
      return [{
        tokenProperties: {
          valid: true,
          action: 'send_email_form',
          invalidReason: null
        },
        riskAnalysis: {
          score: 0.9,
          reasons: []
        }
      }];
    }

    if (token === 'valid-token-low-score') {
      return [{
        tokenProperties: {
          valid: true,
          action: 'send_email_form',
          invalidReason: null
        },
        riskAnalysis: {
          score: 0.3,
          reasons: ['SUSPICIOUS']
        }
      }];
    }

    if (token === 'invalid-token') {
      return [{
        tokenProperties: {
          valid: false,
          action: null,
          invalidReason: 'TOKEN_EXPIRED'
        },
        riskAnalysis: {
          score: 0,
          reasons: []
        }
      }];
    }

    if (token === 'wrong-action') {
      return [{
        tokenProperties: {
          valid: true,
          action: 'wrong_action',
          invalidReason: null
        },
        riskAnalysis: {
          score: 0.8,
          reasons: []
        }
      }];
    }

    // Default: unexpected token
    throw new Error('Mock error: Unexpected token');
  }
}

module.exports = {
  MockRecaptchaClient
};