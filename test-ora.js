import * as readline from 'node:readline/promises';
import ora from 'ora';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function loop() {
  while(true) {
    const answer = await rl.question('Prompt> ');
    console.log('Got:', answer);
    const spinner = ora('Loading').start();
    await new Promise(r => setTimeout(r, 1000));
    spinner.stop();
  }
}
loop();
