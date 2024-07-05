const path = require('path');
const fs = require('fs');

let packageJsonPath;
let packageJsonContent;

// Try resolving with process.cwd()
try {
  packageJsonPath = path.join(process.cwd(), 'package.json');
  console.log(`Trying package.json path from process.cwd(): ${packageJsonPath}`);
  if (!fs.existsSync(packageJsonPath)) {
    console.log('package.json not found at process.cwd()');
    throw new Error('package.json not found');
  }
  console.log(`Found package.json at process.cwd(): ${packageJsonPath}`);
} catch (error) {
  // Fallback to __dirname
  packageJsonPath = path.join(__dirname, '../../package.json');
  console.log(`Trying package.json path from __dirname: ${packageJsonPath}`);
  if (!fs.existsSync(packageJsonPath)) {
    console.log('package.json not found at __dirname fallback');
    throw new Error('package.json not found at __dirname fallback');
  }
  console.log(`Found package.json at __dirname: ${packageJsonPath}`);
}

try {
  packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
  console.log('Package.json content read successfully');
} catch (err) {
  console.error(`Error reading package.json: ${err.message}`);
  throw err;
}

let version;
try {
  const packageJson = JSON.parse(packageJsonContent);
  version = packageJson.version;
  console.log(`Package version found: ${version}`);
} catch (err) {
  console.error(`Error parsing package.json: ${err.message}`);
  throw err;
}

const config = require('../config/config');
const swaggerDef = {
  openapi: '3.0.0',
  info: {
    title: 'Sling API documentation',
    version,
    license: {
      name: 'MIT',
      url: 'https://github.com/slingbiz/sling-api/blob/master/LICENSE',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/v1`,
    },
  ],
};

module.exports = swaggerDef;
