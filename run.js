const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const rootDir = __dirname;

const services = [
  {
    name: 'SERVER ',
    color: '\x1b[36m', // Cyan
    cwd: path.join(rootDir, 'server'),
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    port: 9003
  },
  {
    name: 'LANDING',
    color: '\x1b[32m', // Green
    cwd: path.join(rootDir, 'landing'),
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    port: 9001
  },
  {
    name: 'CLIENT ',
    color: '\x1b[35m', // Magenta
    cwd: path.join(rootDir, 'client'),
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    port: 9002
  }
];

const resetColor = '\x1b[0m';
const grayColor = '\x1b[90m';

console.log(`${grayColor}====================================================${resetColor}`);
console.log(`\x1b[1mStarting all 3 FinLab services inside Antigravity Terminal:${resetColor}`);
services.forEach(s => {
  console.log(`  ${s.color}[${s.name}]${resetColor} -> http://localhost:${s.port}`);
});
console.log(`${grayColor}Press Ctrl+C to stop all services together.${resetColor}`);
console.log(`${grayColor}====================================================\n${resetColor}`);

const children = [];

function pipeLines(stream, prefix, color) {
  if (!stream) return;
  const rl = readline.createInterface({ input: stream });
  rl.on('line', (line) => {
    // Prevent empty trailing lines clutter
    if (line.trim().length === 0) return;
    console.log(`${color}[${prefix}]${resetColor} ${line}`);
  });
}

services.forEach((service) => {
  const child = spawn(service.cmd, service.args, {
    cwd: service.cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  pipeLines(child.stdout, service.name, service.color);
  pipeLines(child.stderr, service.name, '\x1b[31m'); // Red for stderr

  child.on('close', (code) => {
    console.log(`${service.color}[${service.name}]${resetColor} process exited with code ${code}`);
  });

  children.push(child);
});

function cleanup() {
  console.log(`\n${grayColor}Stopping all FinLab services...${resetColor}`);
  children.forEach((child) => {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t']);
      } else {
        child.kill('SIGINT');
      }
    } catch {
      // Ignore if already killed
    }
  });
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

