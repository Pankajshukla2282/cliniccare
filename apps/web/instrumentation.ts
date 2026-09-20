export async function register() {
  // Instrumentation is only supported for the Node.js server runtime.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { setupNodeLogger } = await import('./lib/logger.node');
    setupNodeLogger();
  }
}