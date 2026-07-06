const fs = require('fs');
const path = require('path');

const dirs = [
  'superAdmin',
  'admin',
  'teamAdmin',
  'teamUser',
  'user'
];

const basePath = path.join(__dirname, '..', 'routes');

dirs.forEach(dir => {
  const dirPath = path.join(basePath, dir);
  if (!fs.existsSync(dirPath)) return;

  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (!fs.statSync(filePath).isFile()) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Remove old custom requires
    // content = content.replace(/const\s*{\s*requireRolePrefix\s*}\s*=\s*require\(['"][^'"]+requireRolePrefix['"]\);\s*\n?/g, '');
    content = content.replace(/const\s*{\s*requirePathOwnership\s*}\s*=\s*require\(['"][^'"]+requirePathOwnership['"]\);\s*\n?/g, '');

    // 2. Add guardRoute require if not present
    if (!content.includes('guardRoute')) {
      const importStr = `const { guardRoute } = require('../../middleware/guardRoute');\n`;
      const firstRequireIndex = content.indexOf('require(');
      if (firstRequireIndex !== -1) {
        const lineStartIndex = content.lastIndexOf('\n', firstRequireIndex) + 1;
        content = content.slice(0, lineStartIndex) + importStr + content.slice(lineStartIndex);
      }
    }

    // 3. Replace the middleware stacks with ...guardRoute('feature_id')
    const regex = /protect,\s*requireRolePrefix,\s*requireFeature\(['"]([^'"]+)['"]\),\s*requirePathOwnership\(['"]([^'"]+)['"]\)/g;
    content = content.replace(regex, (match, f1, f2) => {
      return `...guardRoute('${f1}')`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated to guardRoute: ${dir}/${file}`);
  });
});
