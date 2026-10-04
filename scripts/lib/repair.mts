/**
 * The repair verdict: a model repair is accepted only when the gate re-run proves it — the
 * pipeline never keeps a blind repair (scripts/batch.mts rolls a rejected one back).
 */
/** Error lines compared without their numbers (timings shift a little between runs). */
const key = (e: string) => e.replace(/\d+(\.\d+)?/g, '#');
/** A repair's verdict, by the gate: fixed · progress (fewer errors, none new) · rejected (with why). */
export function judgeRepair(before: {ok: boolean; errs: string[]}, after: {ok: boolean; errs: string[]}): {verdict: 'fixed' | 'progress' | 'rejected'; why: string} {
  if (after.ok) return {verdict: 'fixed', why: ''};
  const was = new Set(before.errs.map(key));
  const fresh = after.errs.filter((e) => !was.has(key(e)));
  if (fresh.length) return {verdict: 'rejected', why: `it introduced ${fresh.length} new error(s): ${fresh.slice(0, 3).join(' | ')}`};
  if (after.errs.length >= before.errs.length) return {verdict: 'rejected', why: `the same ${after.errs.length} error(s) remain`};
  return {verdict: 'progress', why: `${before.errs.length} → ${after.errs.length} errors`};
}
