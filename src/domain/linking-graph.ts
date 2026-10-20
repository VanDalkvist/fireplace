import type { FeelingToken, ConnectionEdge } from "./types";

export interface LinkingOptions {
  maxEdgesPerToken?: number;
  sequentialStrength?: number;
  resonanceStrength?: number;
}

export function computeSelectiveEdges(
  existingTokens: FeelingToken[],
  newTokens: FeelingToken[],
  currentEdges: ConnectionEdge[],
  options: LinkingOptions = {}
): ConnectionEdge[] {
  const maxEdges = options.maxEdgesPerToken ?? 2;
  const seqStrength = options.sequentialStrength ?? 1.0;
  const resStrength = options.resonanceStrength ?? 0.8;

  if (existingTokens.length === 0 || newTokens.length === 0) {
    return currentEdges;
  }

  const existingMap = new Set(
    currentEdges.map((e) => `${e.sourceTokenId}::${e.targetTokenId}`)
  );
  const result: ConnectionEdge[] = [...currentEdges];

  // Helper to add edge if not already present
  const addEdge = (edge: ConnectionEdge): boolean => {
    const key1 = `${edge.sourceTokenId}::${edge.targetTokenId}`;
    const key2 = `${edge.targetTokenId}::${edge.sourceTokenId}`;
    if (existingMap.has(key1) || existingMap.has(key2)) {
      return false;
    }
    existingMap.add(key1);
    result.push(edge);
    return true;
  };

  // Group existing tokens by speaker to identify previous speaker's tail
  const lastExistingToken = existingTokens[existingTokens.length - 1];

  for (const token of newTokens) {
    let edgesAddedForToken = 0;

    // 1. Sequential handoff link: connect to the immediate previous speaker's last token
    if (
      lastExistingToken &&
      lastExistingToken.speakerId !== token.speakerId &&
      edgesAddedForToken < maxEdges
    ) {
      const added = addEdge({
        id: `seq-${lastExistingToken.id}-${token.id}`,
        sourceTokenId: lastExistingToken.id,
        targetTokenId: token.id,
        strength: seqStrength,
        kind: "sequential",
      });
      if (added) edgesAddedForToken++;
    }

    // 2. Semantic resonance: find matching emotional family among prior speakers
    if (edgesAddedForToken < maxEdges) {
      // Find candidate from a different speaker with matching family
      const resonanceCandidate = [...existingTokens]
        .reverse()
        .find(
          (t) =>
            t.speakerId !== token.speakerId &&
            t.family === token.family &&
            t.id !== lastExistingToken?.id
        );

      if (resonanceCandidate) {
        const added = addEdge({
          id: `res-${resonanceCandidate.id}-${token.id}`,
          sourceTokenId: resonanceCandidate.id,
          targetTokenId: token.id,
          strength: resStrength,
          kind: "resonance",
        });
        if (added) edgesAddedForToken++;
      }
    }
  }

  return result;
}
