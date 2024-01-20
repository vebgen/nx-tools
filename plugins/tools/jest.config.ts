/* eslint-disable */
export default {
    displayName: 'nxp-tools',
    preset: '../../jest.preset.js',
    transform: {
        '^.+\\.[tj]s$': [
            'ts-jest',
            { tsconfig: '<rootDir>/tsconfig.spec.json' },
        ],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/plugins/tools',
};
