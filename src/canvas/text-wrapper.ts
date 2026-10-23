export interface WrappedTextResult {
  lines: string[];
  effectiveWidth: number;
}

export function wrapCanvasText(
  text: string,
  maxLineWidth = 380,
  measureFn: (str: string) => number,
  maxLines = 3
): WrappedTextResult {
  const clean = text.trim();
  if (!clean) {
    return { lines: [], effectiveWidth: 0 };
  }

  const initialWidth = measureFn(clean);
  if (initialWidth <= maxLineWidth) {
    return { lines: [clean], effectiveWidth: initialWidth };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (measureFn(candidate) <= maxLineWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        if (lines.length === maxLines - 1 && i < words.length - 1) {
          // Final allowed line: gather remaining words and truncate with ellipsis if necessary
          let lastCandidate = word;
          for (let j = i + 1; j < words.length; j++) {
            const nextCand = `${lastCandidate} ${words[j]}`;
            if (measureFn(`${nextCand}...`) <= maxLineWidth) {
              lastCandidate = nextCand;
            } else {
              break;
            }
          }
          lines.push(`${lastCandidate}...`);
          break;
        }
        currentLine = word;
      } else {
        lines.push(word);
        currentLine = "";
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  let maxWidth = 0;
  for (const line of lines) {
    const w = measureFn(line);
    if (w > maxWidth) maxWidth = w;
  }

  return {
    lines,
    effectiveWidth: maxWidth,
  };
}
