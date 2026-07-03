const fs = require('fs');
const path = require('path');

const dirs = [
  'superAdmin',
  'admin',
  'teamAdmin',
  'teamUser'
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

    // Regex to match protect, followed optionally by role middleware and requireFeature
    const regex = /protect,\s*((?:requireSuperAdmin|requireAdmin|requireAdminOrSuperAdmin|requireStaff|requireAdminSuperOrTeamAdmin|requireStaff),\s*)?requireFeature\(['"]([^'"]+)['"]\)/g;
    
    content = content.replace(regex, (match, roleMid, featureId) => {
      return `protect, requireRolePrefix, requireFeature('${featureId}'), requirePathOwnership('${featureId}')`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${dir}/${file}`);
  });
});
