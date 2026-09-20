import fs from 'node:fs';

const root = process.cwd();
const rootPkg = JSON.parse(fs.readFileSync(`${root}/package.json`, 'utf8'));
const apiPkg = JSON.parse(fs.readFileSync(`${root}/apps/api/package.json`, 'utf8'));
const webPkg = JSON.parse(fs.readFileSync(`${root}/apps/web/package.json`, 'utf8'));

const expected = {
  node: '24.21.0',
  npm: /^11\./,
  next: '16.3.3',
  react: /^19\.3\./,
  reactDom: /^19\.3\./,
  nest: /^12\./,
  typescript: /^7\./,
  prisma: /^7\./,
  eslint: /^9\./,
};

const failures = [];
const nodeVersion = process.versions.node;
const npmVersion = process.env.npm_execpath ? null : null;

if (nodeVersion !== expected.node) failures.push(`Node ${nodeVersion}; expected ${expected.node}`);
if (webPkg.dependencies.next !== expected.next) failures.push(`Next.js ${webPkg.dependencies.next}; expected ${expected.next}`);
if (!expected.react.test(webPkg.dependencies.react)) failures.push(`React ${webPkg.dependencies.react}; expected 19.3.x`);
if (!expected.reactDom.test(webPkg.dependencies['react-dom'])) failures.push(`React DOM ${webPkg.dependencies['react-dom']}; expected 19.3.x`);
if (!expected.nest.test(apiPkg.dependencies['@nestjs/core'])) failures.push(`NestJS ${apiPkg.dependencies['@nestjs/core']}; expected 12.x`);
if (!expected.typescript.test(rootPkg.devDependencies.typescript)) failures.push(`TypeScript ${rootPkg.devDependencies.typescript}; expected 7.x`);
if (!expected.prisma.test(rootPkg.devDependencies.prisma)) failures.push(`Prisma ${rootPkg.devDependencies.prisma}; expected 7.x`);
if (!expected.prisma.test(rootPkg.dependencies['@prisma/client'])) failures.push(`Prisma client ${rootPkg.dependencies['@prisma/client']}; expected 7.x`);
if (!expected.eslint.test(rootPkg.devDependencies.eslint)) failures.push(`ESLint ${rootPkg.devDependencies.eslint}; expected 9.x`);

if (failures.length) {
  console.error('Production baseline verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ClinicCare production baseline manifests verified.');
console.log('Node runtime:', nodeVersion);
console.log('npm must be 11.x; run `npm --version` separately in deployment verification.');
