/**
 * Hebrew syllables, counted from the vowel points (niqqud). Each vowel sign is one syllable; a final
 * patach under ח/ע/ה (patach genuva) is counted too. Without niqqud the count is an estimate from the
 * letters, and the counter says so.
 */
const VOWELS = /[ִ-ׇֻ]|ֱ|ֲ|ֳ|ֺ|ֹ/g; // hiriq..qubuts, qamats qatan, hataf
const HOLAM_VAV = /וֹ|וּ(?![ְ-ֻ])/g; // holam male and shuruq carry their own vowel
export function syllables(line: string): { n: number; exact: boolean } {
  const t = line.trim();
  if (!t) return { n: 0, exact: true };
  const hasNiqqud = /[ְ-ׇּ]/.test(t);
  if (hasNiqqud) {
    let n = (t.match(VOWELS) ?? []).length;
    n += (t.match(HOLAM_VAV) ?? []).filter((m) => m.includes('ּ')).length; // shuruq
    // a shva on the first letter of a word is always mobile (shva na), so it is a syllable
    for (const w of t.split(/\s+/)) {
      const m = w.match(/^[א-ת]([ְ-ּׁׂ]*)/);
      if (m && m[1].includes('ְ')) n++;
    }
    return { n, exact: true };
  }
  // estimate: about one syllable per 2.2 letters, at least one per word
  const words = t.split(/\s+/);
  const n = words.reduce((a, w) => a + Math.max(1, Math.round(w.replace(/[^א-ת]/g, '').length / 2.2)), 0);
  return { n, exact: false };
}
export const TARGET = [5, 7, 5];
