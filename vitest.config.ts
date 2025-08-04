import { defineConfig } from 'vitest/config'
import path from 'path'
import { config } from 'dotenv'

// Load environment variables from tests/.env
config({ path: path.resolve(__dirname, 'tests/.env') })

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '$': path.resolve(__dirname, './src')
    }
  }
})