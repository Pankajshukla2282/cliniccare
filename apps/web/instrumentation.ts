export async function register(): Promise<void> {
  // Instrumentation is only supported for the Node.js server runtime.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically load your actual implementation file so Turbopack 
    // never touches it during the Edge runtime analysis phase
    await import('./lib/logger.node');
  }
}