export interface LexiconEntry {
  lemma: string;
  forms: string[];
  family: string;
  valence: number;
  arousal: number;
}

export interface DesireObjectEntry {
  lemma: string;
  forms: string[];
}

export interface RawLexicon {
  families: string[];
  feelings: LexiconEntry[];
  desires: {
    markers: string[];
    objects: DesireObjectEntry[];
    who: string[];
  };
  modifiers: {
    soft: string[];
    strong: string[];
    negation: string[];
  };
  pass: string[];
}

export interface LexiconIndex {
  feel: Map<string, LexiconEntry>;
  obj: Map<string, DesireObjectEntry>;
  mark: Map<string, string>;
  maxF: number;
  maxO: number;
  maxM: number;
  who: Set<string>;
  soft: Set<string>;
  strong: Set<string>;
  neg: Set<string>;
  pass: Set<string>;
  families: string[];
}

const norm = (s: string) => String(s || "").toLowerCase().replace(/ё/g, "е");

export function tokenize(s: string): string[] {
  return norm(s)
    .replace(/[.,;:!?…()«»"]+/g, " | ")
    .replace(/[^a-zа-я0-9|\- ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && t !== "-" && t !== "–");
}

export function buildLexiconIndex(lex: RawLexicon): LexiconIndex {
  const feel = new Map<string, LexiconEntry>();
  const obj = new Map<string, DesireObjectEntry>();
  const mark = new Map<string, string>();
  let maxF = 1, maxO = 1, maxM = 1;

  for (const e of lex.feelings) {
    for (const f of e.forms) {
      const k = tokenize(f).join(" ");
      feel.set(k, e);
      maxF = Math.max(maxF, k.split(" ").length);
    }
  }
  for (const o of lex.desires.objects) {
    for (const f of o.forms) {
      const k = tokenize(f).join(" ");
      obj.set(k, o);
      maxO = Math.max(maxO, k.split(" ").length);
    }
  }
  for (const m of lex.desires.markers) {
    const k = tokenize(m).join(" ");
    mark.set(k, m);
    maxM = Math.max(maxM, k.split(" ").length);
  }

  return {
    feel, obj, mark, maxF, maxO, maxM,
    who: new Set(lex.desires.who.map(norm)),
    soft: new Set(lex.modifiers.soft.map(norm)),
    strong: new Set(lex.modifiers.strong.map(norm)),
    neg: new Set(lex.modifiers.negation.map(norm)),
    pass: new Set(lex.pass.map(norm)),
    families: lex.families,
  };
}

function longest<T>(tokens: string[], i: number, map: Map<string, T>, max: number): [number, T] | null {
  for (let n = Math.min(max, tokens.length - i); n >= 1; n--) {
    const seg = tokens.slice(i, i + n);
    if (seg.includes("|")) continue;
    const v = map.get(seg.join(" "));
    if (v) return [n, v];
  }
  return null;
}

export interface ExtractedFeeling {
  lemma: string;
  family: string;
  valence: number;
  arousal: number;
  form: string;
  intensity: number;
}

export interface ExtractedDesire {
  text: string;
  object: string;
  who: string | null;
}

export interface ExtractionResult {
  feelings: ExtractedFeeling[];
  desires: ExtractedDesire[];
  pass: boolean;
}

export function extractFeelingsAndDesires(phrase: string, idx: LexiconIndex): ExtractionResult {
  const tokens = tokenize(phrase);
  const words = tokens.filter((t) => t !== "|");
  const out: ExtractionResult = { feelings: [], desires: [], pass: false };
  if (!words.length) return out;
  if (words.length <= 2 && idx.pass.has(words[0])) {
    out.pass = true;
    return out;
  }

  const seen = new Set<string>();
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "|") { i++; continue; }

    const m = longest(tokens, i, idx.mark, idx.maxM);
    if (m) {
      let j = i + m[0], got = false;
      while (j < tokens.length && j < i + m[0] + 6 && tokens[j] !== "|") {
        if (j > i + m[0] && longest(tokens, j, idx.mark, idx.maxM)) break;
        const o = longest(tokens, j, idx.obj, idx.maxO);
        if (o) {
          j += o[0];
          let who: string | null = null;
          if (j < tokens.length && idx.who.has(tokens[j])) { who = tokens[j]; j++; }
          const text = o[1].lemma + (who ? " " + who : "");
          if (!seen.has("d:" + text)) {
            seen.add("d:" + text);
            out.desires.push({ text, object: o[1].lemma, who });
          }
          got = true;
          break;
        }
        j++;
      }
      i = got ? j : i + m[0];
      continue;
    }

    const f = longest(tokens, i, idx.feel, idx.maxF);
    if (f) {
      const [n, e] = f;
      const form = tokens.slice(i, i + n).join(" ");
      const negated = idx.neg.has(tokens[i - 1]) && !form.startsWith("не ");
      if (!negated && !seen.has(e.lemma)) {
        let intensity = 1;
        for (const b of [tokens[i - 1], tokens[i - 2]]) {
          if (idx.soft.has(b)) intensity = 0.6;
          else if (idx.strong.has(b)) intensity = 1.4;
        }
        seen.add(e.lemma);
        out.feelings.push({
          lemma: e.lemma,
          family: e.family,
          valence: e.valence,
          arousal: e.arousal,
          form,
          intensity,
        });
      }
      i += n;
      continue;
    }
    i++;
  }
  return out;
}

const CONVERSATIONAL_FILLERS = new Set([
  "ну", "в", "общем", "целом", "как-то", "сейчас", "наверное", "я", "чувствую",
  "мне", "кажется", "у", "меня", "такое", "просто", "вот", "знаете", "немного",
  "очень", "прямо", "сегодня", "вообще", "наверно", "типа", "короче", "ага", "угу"
]);

const DISCOURSE_FILLER_PHRASES = new Set([
  "как раз", "как раз вот", "вот как раз", "в общем", "в общем то", "в целом",
  "так сказать", "то есть", "на самом деле", "по сути", "по сути дела", "как бы",
  "собственно", "собственно говоря", "в принципе", "дело в том", "дело в том что",
  "короче", "короче говоря", "ну вот", "ну и вот", "вот так", "да да", "да да да",
  "ага", "угу", "ну да", "ну нет", "кстати", "кстати говоря", "значит", "в смысле"
]);

export function isPureFillerPhrase(text: string): boolean {
  const norm = text.toLowerCase().replace(/[.,!?;:—\-]/g, " ").replace(/\s+/g, " ").trim();
  if (!norm || norm.length < 2) return true;
  if (DISCOURSE_FILLER_PHRASES.has(norm)) return true;
  const parts = norm.split(" ");
  if (parts.length === 1 && CONVERSATIONAL_FILLERS.has(parts[0])) return true;
  return false;
}

export interface DistillationResult extends ExtractionResult {
  isDesirePhrase?: boolean;
}

