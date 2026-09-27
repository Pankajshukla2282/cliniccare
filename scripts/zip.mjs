import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const output = args[0] || 'cliniccare.zip';

try {
  execSync(`git archive --format=zip --prefix=${output.replace('.zip', '')}/ HEAD > ${output}`, { stdio: 'pipe' });
  console.log(`Zip created: ${output}`);
} catch (err) {
  console.error('Failed to create zip:', err.message);
  process.exit(1);
}