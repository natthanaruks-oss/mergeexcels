const assert = require('assert');
const Ops = require('../public/batch-rename-ops.js');

assert.deepStrictEqual(Ops.splitName('report.final.pdf'), { stem: 'report.final', ext: '.pdf' });
assert.deepStrictEqual(Ops.splitName('README'), { stem: 'README', ext: '' });
assert.strictEqual(Ops.cleanStem('  AR:/ Report   01.  '), 'AR Report 01');
assert.strictEqual(Ops.cleanStem('CON'), '_CON');
assert.strictEqual(Ops.replaceLiteral('AR_AR_01', 'AR', 'SOA'), 'SOA_SOA_01');
assert.strictEqual(Ops.formatRunning(0, 1, 3), '001');
assert.strictEqual(Ops.formatRunning(9, 1, 3), '010');
assert.strictEqual(Ops.normalizeDate('2026-08-13'), '20260813');

const renamed = Ops.renameOne('Report 01.pdf', 0, {
  prefix: 'AR', suffix: 'FINAL', useDate: true, date: '2026-08-13',
  useRunning: true, runningStart: 1, runningDigits: 3,
  separator: '_', clean: true, keepExtension: true,
});
assert.strictEqual(renamed, 'AR_20260813_001_Report 01_FINAL.pdf');

const plan = Ops.buildPlan(['A.pdf', 'a.pdf'], { clean: true, keepExtension: true });
assert.strictEqual(plan.length, 2);
assert.strictEqual(plan[0].collision, true);
assert.strictEqual(plan[1].collision, true);

const safe = Ops.buildPlan(['A.pdf', 'B.pdf'], { useRunning: true, runningStart: 1, runningDigits: 2, separator: '_', clean: true, keepExtension: true });
assert.strictEqual(safe[0].renamed, '01_A.pdf');
assert.strictEqual(safe[1].renamed, '02_B.pdf');
assert.strictEqual(safe.some((r) => r.collision), false);

console.log('Batch Rename Ops tests passed.');
