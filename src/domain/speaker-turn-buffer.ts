export interface PendingTurn {
  text: string;
  speakerSeat?: number;
  startTime: number;
  lastTime: number;
}

export interface FeedResult {
  shouldFlush: boolean;
  flushedPrevious: PendingTurn | null;
  currentTurn: PendingTurn | null;
}

const DANGLING_TRAILING_REGEX =
  /(?:\s|^)(?:для|как|на|в|с|к|по|от|о|об|обо|за|из|под|над|при|без|про|что|чтобы|если|или|но|а|и|дабы|хотя|также|тоже|будто|словно)\s*$/i;

export class SpeakerTurnBuffer {
  private currentTurn: PendingTurn | null = null;
  private maxGapMs: number;
  private history: string[] = [];
  private maxHistory: number;

  constructor(maxGapMs = 2200, maxHistory = 6) {
    this.maxGapMs = maxGapMs;
    this.maxHistory = maxHistory;
  }

  public isDangling(text: string): boolean {
    return DANGLING_TRAILING_REGEX.test(text.trim());
  }

  public feed(text: string, speakerSeat?: number, now = Date.now()): FeedResult {
    const trimmed = text.trim();
    if (!trimmed) {
      return { shouldFlush: false, flushedPrevious: null, currentTurn: this.currentTurn };
    }

    // If there is an existing pending turn
    if (this.currentTurn) {
      const isSameSpeaker =
        this.currentTurn.speakerSeat === speakerSeat ||
        speakerSeat === undefined ||
        this.currentTurn.speakerSeat === undefined;
      const elapsed = now - this.currentTurn.lastTime;
      const wasDangling = this.isDangling(this.currentTurn.text);

      // If it's the same speaker and within gap (or previous chunk was dangling), stitch it
      if (isSameSpeaker && (elapsed <= this.maxGapMs || wasDangling)) {
        this.currentTurn.text = `${this.currentTurn.text} ${trimmed}`.trim();
        this.currentTurn.lastTime = now;
        if (speakerSeat !== undefined && this.currentTurn.speakerSeat === undefined) {
          this.currentTurn.speakerSeat = speakerSeat;
        }
        return {
          shouldFlush: false,
          flushedPrevious: null,
          currentTurn: this.currentTurn,
        };
      }

      // Otherwise, speaker changed or gap exceeded: flush previous turn
      const flushed = this.currentTurn;
      this.currentTurn = {
        text: trimmed,
        speakerSeat,
        startTime: now,
        lastTime: now,
      };
      return {
        shouldFlush: false,
        flushedPrevious: flushed,
        currentTurn: this.currentTurn,
      };
    }

    // No existing turn: start fresh
    this.currentTurn = {
      text: trimmed,
      speakerSeat,
      startTime: now,
      lastTime: now,
    };

    return {
      shouldFlush: false,
      flushedPrevious: null,
      currentTurn: this.currentTurn,
    };
  }

  public checkTimeout(now = Date.now()): PendingTurn | null {
    if (!this.currentTurn) return null;

    const elapsed = now - this.currentTurn.lastTime;
    const isDangling = this.isDangling(this.currentTurn.text);

    // If dangling, wait up to 2x maxGapMs for continuation
    const timeoutThreshold = isDangling ? this.maxGapMs * 2 : this.maxGapMs;

    if (elapsed >= timeoutThreshold) {
      const flushed = this.currentTurn;
      this.currentTurn = null;
      return flushed;
    }

    return null;
  }

  public flush(): PendingTurn | null {
    const flushed = this.currentTurn;
    this.currentTurn = null;
    return flushed;
  }

  public commitCompletedTurn(phrase: string): void {
    const clean = phrase.trim();
    if (!clean) return;
    this.history.push(clean);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  public getRecentHistory(limit = 3): string[] {
    return this.history.slice(-limit);
  }
}
