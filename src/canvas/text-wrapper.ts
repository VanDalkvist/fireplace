export interface WrappedTextBlock {
  text: string;
  lines: string[];
  width: number;
}

export interface WrappedTextResult {
  lines: string[];
  effectiveWidth: number;
  blocks: WrappedTextBlock[];
}

interface LineRange { start: number; end: number; text: string }

function lineRanges(text: string, width: number, measure: (text: string) => number): LineRange[] {
  const segments = [...new Intl.Segmenter("ru", { granularity: "grapheme" }).segment(text)];
  const ranges: LineRange[] = [];
  let cursor = 0;
  while (cursor < segments.length) {
    const start = segments[cursor].index;
    let next = cursor;
    let wordBreak = -1;
    while (next < segments.length) {
      const end = segments[next].index + segments[next].segment.length;
      if (next > cursor && measure(text.slice(start, end).trim()) > width) break;
      if (segments[next].segment === " ") wordBreak = next + 1;
      next++;
    }
    if (next < segments.length && wordBreak > cursor) next = wordBreak;
    const last = segments[next - 1];
    const end = last.index + last.segment.length;
    ranges.push({ start, end, text: text.slice(start, end).trim() });
    cursor = next;
  }
  return ranges;
}

/** Five lines is a display-block budget, never a content truncation budget. */
export function wrapCanvasText(
  text: string,
  maxLineWidth = 640,
  measureFn: (str: string) => number,
  maxLines = 5,
): WrappedTextResult {
  if (!Number.isFinite(maxLineWidth) || maxLineWidth <= 0 || !Number.isInteger(maxLines) || maxLines < 1) {
    throw new Error("Invalid Canvas text layout budget");
  }
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return { lines: [], effectiveWidth: 0, blocks: [] };
  const ranges = lineRanges(clean, maxLineWidth, measureFn);
  const blocks: WrappedTextBlock[] = [];
  for (let index = 0; index < ranges.length; index += maxLines) {
    const group = ranges.slice(index, index + maxLines);
    const lines = group.map(line => line.text);
    blocks.push({
      text: clean.slice(group[0].start, group[group.length - 1].end),
      lines,
      width: Math.max(...lines.map(measureFn)),
    });
  }
  return {
    lines: ranges.map(line => line.text),
    effectiveWidth: Math.max(...blocks.map(block => block.width)),
    blocks,
  };
}
