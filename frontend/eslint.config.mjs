import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    files: ['components/animations/TextType.tsx'],
    rules: {
      'react-hooks/refs': 'off',
    },
  },
];
