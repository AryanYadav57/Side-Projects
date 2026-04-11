function normalizeToken(text) {
  return String(text || '').toLowerCase().trim();
}

function tokenize(text) {
  return normalizeToken(text)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));

  if (!setA.size || !setB.size) return 0;

  let intersect = 0;
  setA.forEach((value) => {
    if (setB.has(value)) intersect += 1;
  });

  const union = new Set([...setA, ...setB]).size;
  return union ? intersect / union : 0;
}

function recencyGapFactor(lastSeen) {
  const now = Date.now();
  const gapMs = Math.max(0, now - Number(lastSeen || 0));
  const gapHours = gapMs / (1000 * 60 * 60);
  return Math.min(2.5, 1 + gapHours / 72);
}

export function scoreConnection({ concept, candidate }) {
  const similarity = jaccardSimilarity(concept, candidate?.label || candidate?.normalizedLabel || '');
  const weight = Number(candidate?.weight || 0.1);
  const recency = recencyGapFactor(candidate?.lastSeen);
  const score = Math.min(1, similarity * 0.72 + Math.min(1, weight) * 0.18 + Math.min(1, recency / 2.5) * 0.1);

  return {
    score,
    similarity,
    recency,
    nodeId: candidate?.id,
    nodeLabel: candidate?.label,
  };
}

export function classifyConnection(score) {
  if (score > 0.9) return 'strong';
  if (score >= 0.8) return 'medium';
  if (score >= 0.65) return 'weak';
  return 'noise';
}

export function buildTopConnectionCandidates(concepts, existingNodes) {
  const candidates = [];

  (concepts || []).forEach((concept) => {
    (existingNodes || []).forEach((node) => {
      const scored = scoreConnection({ concept, candidate: node });
      if (scored.score > 0) {
        candidates.push({ concept, ...scored, tier: classifyConnection(scored.score) });
      }
    });
  });

  return candidates.sort((a, b) => b.score - a.score);
}
