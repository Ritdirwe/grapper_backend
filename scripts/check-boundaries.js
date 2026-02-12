const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const violations = [];

function walk(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, fileList);
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function checkFile(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('forwardRef(')) {
    violations.push(`${rel}: uses forwardRef`);
  }

  const isSharedOrCommon = rel.startsWith('src/common/') || rel.startsWith('src/shared/');
  if (isSharedOrCommon) {
    const forbiddenImport = /from\s+['"][^'"]*(modules\/)[^'"]*['"]/g;
    if (forbiddenImport.test(content)) {
      violations.push(`${rel}: common/shared imports from modules`);
    }
  }
}

for (const file of walk(SRC)) {
  checkFile(file);
}

if (violations.length > 0) {
  console.error('Boundary check failed:');
  for (const v of violations) {
    console.error(`- ${v}`);
  }
  process.exit(1);
}

console.log('Boundary check passed');
