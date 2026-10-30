const assert = require('node:assert/strict');
const Ops = require('../public/pdf-to-png-ops.js');

// dpi normalization
assert.equal(Ops.normalizeDpi(150), 150);
assert.equal(Ops.normalizeDpi('300'), 300);
assert.equal(Ops.normalizeDpi('abc'), 150, 'invalid -> default');
assert.equal(Ops.normalizeDpi(5), 36, 'clamped to minimum');
assert.equal(Ops.normalizeDpi(5000), 600, 'clamped to maximum');
assert.deepEqual(Ops.DPI_CHOICES, [72, 96, 150, 200, 300]);

// filenames
assert.equal(Ops.sanitizeBase('AR Report: Q3/2026.pdf'), 'AR Report Q3 2026');
assert.equal(Ops.sanitizeBase('...'), 'document');
assert.equal(Ops.sanitizeBase(''), 'document');
assert.equal(Ops.sanitizeBase('รายงาน ลูกหนี้.PDF'), 'รายงาน ลูกหนี้');
assert.equal(Ops.pageFileName('doc.pdf', 0, 5), 'doc_p001.png');
assert.equal(Ops.pageFileName('doc', 41, 120), 'doc_p042.png');
assert.equal(Ops.pageFileName('doc', 999, 1234), 'doc_p1000.png', 'pad widens with page count');

// output kind
assert.equal(Ops.outputKind(1), 'png');
assert.equal(Ops.outputKind(2), 'zip');
assert.equal(Ops.outputKind(50), 'zip');

// planning: A4 portrait at 72 / 150 / 300 DPI
const a4 = (index) => ({ index, width: 595.28, height: 841.89 });
let plan = Ops.planPages([a4(0)], { dpi: 72 });
assert.equal(plan.pages[0].widthPx, 596);
assert.equal(plan.pages[0].heightPx, 842);
assert.equal(plan.pages[0].downscaled, false);
plan = Ops.planPages([a4(0), a4(2)], { dpi: 150 });
assert.deepEqual(plan.pages.map((p) => p.index), [0, 2], 'keeps original page indexes');
assert.equal(plan.pages[0].widthPx, Math.ceil(595.28 * 150 / 72));
plan = Ops.planPages([a4(0)], { dpi: 300 });
assert.equal(plan.pages[0].widthPx, 2481);
assert.equal(plan.pages[0].heightPx, 3508); // 841.89pt * 300/72 = 3507.9 -> ceil
assert.equal(plan.dpi, 300);
assert.equal(plan.downscaledCount, 0);

// huge page is scaled down and reported, never silently oversized
const poster = { index: 0, width: 2400, height: 3400 }; // ~ 33x47 in
plan = Ops.planPages([poster], { dpi: 300 });
assert.equal(plan.downscaledCount, 1);
assert.equal(plan.pages[0].downscaled, true);
assert.ok(plan.pages[0].widthPx * plan.pages[0].heightPx <= Ops.MAX_PIXELS_PER_PAGE * 1.001);
assert.ok(plan.pages[0].scale < 300 / 72);

// limits
assert.throws(() => Ops.planPages([], { dpi: 150 }), /ไม่พบหน้า/);
assert.throws(() => Ops.planPages([a4(0), a4(1), a4(2)], { dpi: 150, maxPages: 2 }), /Page limit/);
assert.throws(() => Ops.planPages(Array.from({ length: 100 }, (_, i) => a4(i)), { dpi: 600, maxPages: 100 }), /ใหญ่เกินไป/);
assert.doesNotThrow(() => Ops.planPages(Array.from({ length: 100 }, (_, i) => a4(i)), { dpi: 150, maxPages: 100 }));
assert.throws(() => Ops.planPages([{ index: 3, width: 0, height: 10 }], {}), /ไม่ถูกต้อง/);

console.log('PDF to PNG Ops tests passed.');
