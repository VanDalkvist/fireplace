import { describe, it, expect } from "vitest";
import {
  stripHandoffWord,
  shouldSubsumeToken,
  dispatchSubsumedToken,
  type RecentTokenSnapshot,
} from "../src/domain/token-subsumption";
import {
  createInitialState,
  addFeelingToken,
  addDesireToken,
  updateFeelingToken,
  updateDesireToken,
} from "../src/domain/session-fsm";

describe("stripHandoffWord", () => {
  it("strips trailing 'передаю' or 'передаю слово' from phrase", () => {
    expect(stripHandoffWord("Я чувствую спокойствие и тепло. Передаю.")).toBe(
      "Я чувствую спокойствие и тепло"
    );
    expect(stripHandoffWord("Мне так хорошо, передаю слово")).toBe(
      "Мне так хорошо"
    );
    expect(stripHandoffWord("Очень устал за день... передаю")).toBe(
      "Очень устал за день"
    );
  });

  it("returns empty string if utterance is only handoff word", () => {
    expect(stripHandoffWord("Передаю")).toBe("");
    expect(stripHandoffWord("передаю слово")).toBe("");
    expect(stripHandoffWord("передаю...")).toBe("");
    expect(stripHandoffWord("  Передаю  ")).toBe("");
  });

  it("does not strip 'передавать' or occurrences inside the phrase", () => {
    expect(stripHandoffWord("Я хочу передавать радость")).toBe(
      "Я хочу передавать радость"
    );
    expect(stripHandoffWord("Передаю привет всем")).toBe(
      "Передаю привет всем"
    );
  });
});

describe("shouldSubsumeToken", () => {
  const baseTime = 100000;
  const recent: RecentTokenSnapshot = {
    id: "feel-1",
    text: "радуюсь, что получилось реализовать",
    kind: "feeling",
    speakerId: 1,
    timestamp: baseTime,
  };

  it("subsumes extended phrase from the same speaker within 20s", () => {
    const newText = "радуюсь, что получилось реализовать парсинг с памятью";
    const res = shouldSubsumeToken(recent, newText, 1, baseTime + 5000);
    expect(res).toBe(true);
  });

  it("subsumes exact duplicate or minor variation from the same speaker", () => {
    expect(shouldSubsumeToken(recent, recent.text, 1, baseTime + 2000)).toBe(true);
  });

  it("rejects subsumption when speaker changed (preserves voice boundaries)", () => {
    const newText = "радуюсь, что получилось реализовать парсинг с памятью";
    // Speaker 2 spoke — must NOT subsume speaker 1's token!
    const res = shouldSubsumeToken(recent, newText, 2, baseTime + 3000);
    expect(res).toBe(false);
  });

  it("rejects subsumption when elapsed time exceeds 20s window", () => {
    const newText = "радуюсь, что получилось реализовать парсинг с памятью";
    const res = shouldSubsumeToken(recent, newText, 1, baseTime + 25000);
    expect(res).toBe(false);
  });

  it("rejects subsumption for semantically distinct phrases", () => {
    const newText = "а ещё мне почему-то немного грустно";
    const res = shouldSubsumeToken(recent, newText, 1, baseTime + 4000);
    expect(res).toBe(false);
  });

  it("handles null recent token safely", () => {
    expect(shouldSubsumeToken(null, "любая фраза", 1, baseTime)).toBe(false);
  });
});

describe("Session FSM token updates (subsumption)", () => {
  it("updates existing feeling token text without replacing ID or array length", () => {
    const initial = createInitialState(1);
    const withFeeling = addFeelingToken(initial, {
      id: "feel-123",
      text: "радуюсь",
      lemma: "радуюсь",
      family: "радость",
      valence: 0.8,
      arousal: 0.5,
      intensity: 1.0,
      speakerId: 1,
      timestamp: 1000,
    });
    expect(withFeeling.feelings).toHaveLength(1);

    const updated = updateFeelingToken(
      withFeeling,
      "feel-123",
      "радуюсь, что получилось реализовать",
      "радость",
      0.9
    );
    expect(updated.feelings).toHaveLength(1);
    expect(updated.feelings[0].id).toBe("feel-123");
    expect(updated.feelings[0].text).toBe("радуюсь, что получилось реализовать");
    expect(updated.feelings[0].lemma).toBe("радуюсь, что получилось реализовать");
    expect(updated.feelings[0].valence).toBe(0.9);
  });

  it("updates existing desire token text cleanly", () => {
    const initial = createInitialState(1);
    const withDesire = addDesireToken(initial, {
      id: "desire-456",
      text: "хочется спать",
      object: "хочется спать",
      who: "",
      speakerId: 2,
      timestamp: 2000,
    });
    expect(withDesire.desires).toHaveLength(1);

    const updated = updateDesireToken(
      withDesire,
      "desire-456",
      "хочется хорошенько выспаться"
    );
    expect(updated.desires).toHaveLength(1);
    expect(updated.desires[0].id).toBe("desire-456");
    expect(updated.desires[0].text).toBe("хочется хорошенько выспаться");
    expect(updated.desires[0].object).toBe("хочется хорошенько выспаться");
  });
});

describe("dispatchSubsumedToken", () => {
  it("calls onUpdateFeeling when new thought subsumes recent fragment", () => {
    let updatedId = "";
    let updatedText = "";
    let addedCount = 0;

    const recent: RecentTokenSnapshot = {
      id: "feel-abc",
      text: "радуюсь",
      kind: "feeling",
      speakerId: 1,
      timestamp: Date.now(),
    };

    const nextSnapshot = dispatchSubsumedToken({
      phase: "feelings",
      clean: "радуюсь, что получилось",
      speakerId: 1,
      family: "радость",
      valence: 0.8,
      recent,
      onAddFeeling: () => {
        addedCount++;
        return "feel-new";
      },
      onAddDesire: () => "desire-new",
      onUpdateFeeling: (id, text) => {
        updatedId = id;
        updatedText = text;
      },
    });

    expect(addedCount).toBe(0);
    expect(updatedId).toBe("feel-abc");
    expect(updatedText).toBe("радуюсь, что получилось");
    expect(nextSnapshot.id).toBe("feel-abc");
    expect(nextSnapshot.text).toBe("радуюсь, что получилось");
  });

  it("calls onAddFeeling when new thought is from a different speaker", () => {
    let addedCount = 0;
    const recent: RecentTokenSnapshot = {
      id: "feel-abc",
      text: "радуюсь",
      kind: "feeling",
      speakerId: 1,
      timestamp: Date.now(),
    };

    const nextSnapshot = dispatchSubsumedToken({
      phase: "feelings",
      clean: "радуюсь, что получилось",
      speakerId: 2, // different speaker!
      family: "радость",
      valence: 0.8,
      recent,
      onAddFeeling: () => {
        addedCount++;
        return "feel-speaker2";
      },
      onAddDesire: () => "desire-new",
    });

    expect(addedCount).toBe(1);
    expect(nextSnapshot.id).toBe("feel-speaker2");
    expect(nextSnapshot.speakerId).toBe(2);
  });
});
