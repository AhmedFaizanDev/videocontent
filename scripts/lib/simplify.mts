/**
 * The fallback treatment: a composition that fails on layout or legibility is re-expressed with
 * its densest element alone, full screen (still a composition, so any element kind works); the
 * other elements' key facts become notes, moves on the kept element stay. The narration is kept
 * word for word: nothing lost, nothing invented.
 */
const WEIGHT: Record<string, number> = {table: 5, flow: 4, bars: 3, timeline: 3, cycle: 3, hub: 3, stack: 3, art: 2, stat: 1};
export function simplify(s: any): any {
  if (s?.type !== 'scene' || (s.elements ?? []).length < 2) return s;
  const els: any[] = s.elements;
  const lead = [...els].sort((a, b) => (WEIGHT[b.kind] ?? 0) - (WEIGHT[a.kind] ?? 0))[0];
  const mine = (t?: string) => !t || t.split('.')[0] === lead.id;
  const asList = (v: any) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
  const moves = (s.moves ?? [])
    .map((m: any) => {
      const keep: any = {...(m.say ? {say: m.say} : {}), ...(m.note ? {note: m.note} : {})};
      if (m.focus && mine(m.focus)) keep.focus = m.focus;
      if (m.zoom && keep.focus) keep.zoom = m.zoom;
      if (m.back) keep.back = true;
      if (m.label && mine(m.label.on)) keep.label = m.label;
      else if (m.label && !keep.note) keep.note = m.label.text;
      const act = asList(m.act).filter((a: string) => mine(a));
      if (act.length) keep.act = act;
      if (m.pulse && mine(m.pulse)) keep.pulse = m.pulse;
      return keep;
    })
    .filter((m: any) => Object.keys(m).some((k) => k !== 'say'));
  // the dropped elements' numbers survive as notes on their own words
  const facts = els
    .filter((e) => e !== lead && e.kind === 'stat')
    .map((e) => ({...(e.say ? {say: e.say} : {}), note: `${e.display ?? e.value}${e.label ? ` ${e.label}` : ''}`.slice(0, 90)}));
  const {reveal: _r, ...leadEl} = lead;
  return {...s, elements: [leadEl], moves: [...moves, ...facts], layout: undefined};
}
