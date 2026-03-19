import { spawn } from 'child_process';

const cli = spawn('node', ['bin/axiom.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '1' }
});

cli.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(str);
  
  if (str.includes('> ')) {
    console.log('\n[TEST] Sending "hi" to CLI...');
    cli.stdin.write('hi\n');
  }
});

cli.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

cli.on('close', (code) => {
  console.log(`\n[TEST] CLI exited with code ${code}`);
});
