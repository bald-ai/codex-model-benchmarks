import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, delimiter } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { parseArgs, protocolTier, observedTier, calculateMetrics } from '../benchmark.mjs';
const exec = promisify(execFile);

test('parse tier, reject malformed options before launching Codex', async () => {
  assert.equal((await parseArgs([])).serviceTier,'normal');
  assert.equal((await parseArgs(['--service-tier','Fast'])).serviceTier,'fast');
  assert.equal(protocolTier('normal'),'default');
  assert.equal(protocolTier('fast'),'fast');
  assert.equal(protocolTier('fast',{serviceTiers:[{id:'priority',name:'Fast'}]}),'priority');
  for (const args of [['--allow-unlisted-model'],['--service-tier'],['--service-tier','priority'],['--models'],['--timeout-ms','NaN'],['--delay-ms','-1'],['--models','a,']]) {
    await assert.rejects(parseArgs(args));
  }
});
test('missing observations are unknown, not inferred from requested tier', () => {
  assert.equal(observedTier({serviceTierForTurn:'fast'}),null);
  assert.equal(observedTier({usageMetadata:{metadata:{service_tier:'fast'}}}),'fast');
  const metrics = calculateMetrics({usage:null, firstTextMs:null,lastTextMs:null,requestStartMs:10,completedMs:20});
  assert.equal(metrics.ttftMs,null); assert.equal(metrics.streamTps,null); assert.equal(metrics.effectiveTps,null);
});

for (const [tier, scenario] of [['normal','ok'],['fast','ok'],['fast','legacy'],['fast','unsupported'],['fast','ack-mismatch'],['fast','rpc-error'],['fast','failed'],['fast','mismatch'],['fast','exit'],['fast','timeout'],['normal','pagination'],['normal','unlisted-ok'],['fast','unlisted-ok'],['normal','unlisted-denied'],['fast','unlisted-rerouted'],['normal','unlisted-no-opt-in']]) {
  test(`${tier}: ${scenario}`, async () => {
    const wireTier = scenario === 'legacy' ? 'priority' : protocolTier(tier);
    const output = await mkdtemp(resolve(tmpdir(),'codex-bench-test-'));
    try {
      let error;
      try {
        await exec(process.execPath,['benchmark.mjs','--models','test-model','--efforts','high,low','--service-tier',tier,'--output',output,...(scenario.startsWith('unlisted') && scenario !== 'unlisted-no-opt-in' ? ['--allow-unlisted-model'] : []),'--timeout-ms',scenario === 'timeout' ? '150' : '3000'], {
          cwd:resolve(import.meta.dirname,'..'), timeout:8000,
          env:{...process.env,PATH:resolve(import.meta.dirname,'fixtures')+delimiter+process.env.PATH,BENCH_TEST_SCENARIO:scenario,BENCH_TEST_TIER:wireTier},
        });
      } catch (caught) { error = caught; }
      const summary = JSON.parse(await readFile(resolve(output,'summary.json'),'utf8'));
      if (['ok','legacy','pagination','unlisted-ok'].includes(scenario)) {
        assert.equal(error,undefined); assert.equal(summary.failure,null);
        assert.equal(summary.results.length,2);
        if (scenario === 'pagination') assert.equal(summary.catalogEvidence.pageCount,2);
        if (scenario === 'unlisted-ok') { assert.equal(summary.warnings.length,1); assert.equal(summary.results[0].catalogListed,false); }
        for (const result of summary.results) {
          assert.equal(result.requestedProtocolTier,wireTier);
          assert.equal(result.acknowledgedThreadServiceTier,wireTier);
          assert.equal(result.effectiveServiceTier,wireTier);
        }
      } else {
        assert.ok(error); assert.ok(summary.failure);
        if (scenario === 'unlisted-denied') assert.match(summary.failure,/not supported with this account/);
        if (scenario === 'unlisted-rerouted') assert.match(summary.failure,/got another-model/);
        if (scenario === 'unlisted-no-opt-in') assert.equal(summary.attempts.length,0);
        if (scenario === 'failed') {
          assert.equal(summary.results[0].ttftMs,null);
          assert.deepEqual(summary.results[0].errors,['Test failure']);
        }
      }
    } finally { await rm(output,{recursive:true,force:true}); }
  });
}
