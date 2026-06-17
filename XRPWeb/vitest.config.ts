import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    snapshotFormat: {
        printBasicPrototype: true
    },
    setupFiles: ["./setupTests.ts"],
  },
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: '@components', replacement: fileURLToPath(new URL('./src/components', import.meta.url)) },
      { find: '@managers', replacement: fileURLToPath(new URL('./src/managers', import.meta.url)) },
      { find: '@connections', replacement: fileURLToPath(new URL('./src/connections', import.meta.url)) },
      { find: '@utils', replacement: fileURLToPath(new URL('./src/utils', import.meta.url)) },
      { find: '@assets', replacement: fileURLToPath(new URL('./src/assets', import.meta.url)) },
    ]
  },
})