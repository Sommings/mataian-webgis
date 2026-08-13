import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const distDir = path.resolve('dist');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Please run build first.');
  process.exit(1);
}

try {
  console.log('🚀 Preparing deployment to GitHub Pages...');
  
  // Clean up any existing .git inside dist
  const gitInDist = path.join(distDir, '.git');
  if (fs.existsSync(gitInDist)) {
    fs.rmSync(gitInDist, { recursive: true, force: true });
  }

  execSync('git init', { cwd: distDir, stdio: 'inherit' });
  execSync('git checkout -b gh-pages', { cwd: distDir, stdio: 'inherit' });
  execSync('git add -A', { cwd: distDir, stdio: 'inherit' });
  execSync('git commit -m "deploy: update WebGIS build"', { cwd: distDir, stdio: 'inherit' });
  execSync('git remote add origin https://github.com/Sommings/mataian-webgis.git', { cwd: distDir, stdio: 'inherit' });
  
  console.log('📡 Pushing build to gh-pages branch...');
  execSync('git push -f origin gh-pages', { cwd: distDir, stdio: 'inherit' });
  
  console.log('✅ Successfully deployed to GitHub Pages!');
} catch (err) {
  console.error('❌ Deployment failed:', err.message);
  process.exit(1);
}
