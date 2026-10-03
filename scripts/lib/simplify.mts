/**
 * The fallback treatment: a composition that still fails after the repairs is re-expressed in the
 * safest screen that carries the same content — its densest element full screen, the other
 * elements' facts as notes. The narration is kept word for word: nothing lost, nothing invented.
 */
export function simplify(s: any): any {
  if (s?.type !== 'scene') return s;
  const els: any[] = s.elements ?? [];
  const lead = els.find((e) => e.kind === 'table') ?? els.find((e) => e.kind === 'flow') ?? els.find((e) => e.kind === 'art') ?? els[0];
  const notes = (s.moves ?? []).filter((m: any) => m.note && m.say).map((m: any) => ({say: m.say, note: m.note}));
  const statNotes = els.filter((e) => e.kind === 'stat' && e.say).map((e) => ({say: e.say, note: `${e.display ?? e.value}${e.label ? ` ${e.label}` : ''}`.slice(0, 90)}));
  const base = {kicker: s.kicker, narration: s.narration};
  if (lead?.kind === 'table') return {type: 'table', ...base, columns: lead.columns, rows: lead.rows, ...(lead.say ? {say: lead.say} : {}), ...(lead.bars ? {bars: lead.bars} : {}), notes: [...notes, ...statNotes]};
  if (lead?.kind === 'flow') return {type: 'flow', ...base, mermaid: lead.mermaid, notes: [...notes, ...statNotes]};
  if (lead?.kind === 'art') {
    const points = (s.moves ?? [])
      .filter((m: any) => m.label || m.note)
      .map((m: any) => ({...(m.label ? {on: m.label.on.split('.')[1], label: m.label.text} : {}), ...(m.note ? {note: m.note} : {}), ...(m.say ? {say: m.say} : {})}));
    return {type: 'explain', ...base, art: lead.art, ...(lead.data ? {data: lead.data} : {}), points: [...points, ...statNotes]};
  }
  return {type: 'summary', ...base, notes: [...notes, ...statNotes].slice(0, 4)};
}
