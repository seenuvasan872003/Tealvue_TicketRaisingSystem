const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(walk(filePath));
      }
    } else {
      results.push(filePath);
    }
  });
  return results;
};

const searchCode = () => {
  const rootDir = path.join(__dirname, '..');
  const files = walk(rootDir);
  console.log(`Searching ${files.length} files...`);
  
  files.forEach(f => {
    if (f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.json')) {
      const content = fs.readFileSync(f, 'utf8');
      if (/agency|agencies/i.test(content)) {
        console.log(`Found in: ${f}`);
      }
    }
  });
};

searchCode();
