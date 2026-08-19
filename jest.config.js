module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Test file patterns
    testMatch: [
        '**/__tests__/**/*.test.js',
        '**/__tests__/**/*.spec.js'
    ],

    // Coverage configuration
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/__tests__/mocks/',
        '/config/'
    ],
    coverageReporters: ['text', 'lcov', 'html'],

    // Reporters
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: './test-results',
            outputName: 'junit.xml'
        }]
    ],

    // Timeout
    testTimeout: 10000,

    // Verbose output
    verbose: true,

    // Setup files - AHORA CON LAS RUTAS CORRECTAS
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

    // Global teardown - AHORA CON LA RUTA CORRECTA
    globalTeardown: '<rootDir>/__tests__/teardown.js'
};
