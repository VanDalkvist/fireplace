export interface SpeakerIdentificationResult {
  matched: boolean;
  speakerId: string;
  seatNumber: number;
  score: number;
  autoEnrolled?: boolean;
}

export interface SpeakerIdentificationPort {
  identify(audioBlob: Blob): Promise<SpeakerIdentificationResult | null>;
  reset(): Promise<boolean>;
  getEnrolledSpeakers(): Promise<Array<{ speakerId: string; seatNumber: number }>>;
  isAvailable(): Promise<boolean>;
}
