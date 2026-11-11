import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './generated/openapi.json',
  output: './generated/client',
  plugins: [
    '@hey-api/client-fetch',
    '@hey-api/sdk',
    '@hey-api/typescript',
    'zod',
    '@tanstack/react-query',
  ],
});
