import rawLexicon from "../../upstream/lexicon.json";
import { buildLexiconIndex, type LexiconIndex, type RawLexicon } from "./lexicon-engine";

export const defaultLexiconIndex: LexiconIndex = buildLexiconIndex(
  rawLexicon as unknown as RawLexicon
);
