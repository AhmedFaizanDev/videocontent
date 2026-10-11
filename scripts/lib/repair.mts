/**
 * The repair verdict: a model repair is kept only when the gate re-run proves it (scripts/batch.mts
 * rolls a rejected one back).
 */
/** Error lines compared without their numbers (timings shift a little between runs). */
const key = (e: string) => e.replace(/\d+(\.\d+)?/g, '#');
/** A script that doesn't compile stops the gate before timing and layout: clearing it reveals errors, it doesn't cause them. */
const blocking = (e: string) => /shorthand scene|schema|unknown play/.test(e);
/** A repair's verdict, by the gate: fixed · progress (fewer errors, none new — or the script compiles again) · rejected (with why). */
export function judgeRepair(before: {ok: boolean; errs: string[]}, after: {ok: boolean; errs: string[]}): {verdict: 'fixed' | 'progress' | 'rejected'; why: string} {
  if (after.ok) return {verdict: 'fixed', why: ''};
  if (before.errs.some(blocking) && !after.errs.some(blocking)) return {verdict: 'progress', why: `compiles again; ${after.errs.length} error(s) now visible`};
  const was = new Set(before.errs.map(key));
  const fresh = after.errs.filter((e) => !was.has(key(e)));
  if (fresh.length) return {verdict: 'rejected', why: `it introduced ${fresh.length} new error(s): ${fresh.slice(0, 3).join(' | ')}`};
  if (after.errs.length >= before.errs.length) return {verdict: 'rejected', why: `the same ${after.errs.length} error(s) remain`};
  return {verdict: 'progress', why: `${before.errs.length} → ${after.errs.length} errors`};
}
