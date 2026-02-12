const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && full.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function isReExportShim(text) {
  const normalized = text.trim();
  return (
    /^export\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?\s*$/.test(normalized) ||
    /^export\s*\*\s*from\s*['"][^'"]+['"];?\s*$/.test(normalized)
  );
}

const files = walk(SRC);

const moduleFiles = files.filter((f) => rel(f).startsWith('src/modules/'));
const contextFiles = files.filter((f) => rel(f).startsWith('src/contexts/'));

const moduleShimFiles = [];
const moduleNonShimFiles = [];

for (const file of moduleFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (isReExportShim(content)) {
    moduleShimFiles.push(rel(file));
  } else {
    moduleNonShimFiles.push(rel(file));
  }
}

const contextImportsModules = [];
for (const file of contextFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes("@modules/") || content.includes('/modules/')) {
    contextImportsModules.push(rel(file));
  }
}

console.log('DDD migration status');
console.log('--------------------');
console.log(`Module files total: ${moduleFiles.length}`);
console.log(`Module shim files : ${moduleShimFiles.length}`);
console.log(`Module non-shim   : ${moduleNonShimFiles.length}`);
console.log(`Context->modules imports: ${contextImportsModules.length}`);

if (moduleNonShimFiles.length > 0) {
  console.log('\nTop module non-shim files:');
  for (const f of moduleNonShimFiles.slice(0, 20)) {
    console.log(`- ${f}`);
  }
}

if (contextImportsModules.length > 0) {
  console.log('\nTop context files importing modules:');
  for (const f of contextImportsModules.slice(0, 20)) {
    console.log(`- ${f}`);
  }
}
