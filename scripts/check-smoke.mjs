// Run reviewed Tic-Tac-Toe output using Node's native TypeScript stripping.
// Feed each move only after a prompt; no arbitrary sleeps or package installs.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
async function play(file, moves, expected, validateInput = false) {
  const child = spawn(process.execPath, [resolve(file)], {stdio:['pipe','pipe','pipe']});
  let transcript = '', stderr = '', pending = '', index = 0;
  const timeout = setTimeout(() => child.kill(), 5000);
  child.stdout.on('data', data => {
    const text = data.toString(); transcript += text; pending += text;
    if (expected.test(transcript)) child.stdin.end();
    if (/[:>]\s*$/.test(pending) && index < moves.length) {
      child.stdin.write(moves[index++] + '\n'); pending = '';
    }
  });
  child.stderr.on('data', data => stderr += data);
  try {
    const code = await new Promise((resolveExit, reject) => { child.on('error',reject); child.on('exit',resolveExit); });
    assert.equal(code,0,stderr || transcript);
    assert.match(transcript,expected);
    if (validateInput) {
      assert.match(transcript,/invalid|enter a|number.*1.*9/i);
      assert.match(transcript,/occupied|taken/i);
    }
  } finally { clearTimeout(timeout); child.kill(); }
}
for (const file of process.argv.slice(2)) {
  await play(file,['bad','1','1','4','2','5','3'],/X.*wins|winner.*X/i,true);
  await play(file,['1','2','3','5','4','6','8','7','9'],/draw/i);
  console.log(`${file}: invalid input, occupied cell, X win and draw passed; exits cleanly`);
}
