export interface DemoItem {
  text: string;
  family?: string;
  valence?: number;
  desire?: string;
}

export const DEMO_PHRASES: DemoItem[] = [
  { text: "спокойствие и тепло", family: "спокойствие", valence: 0.8 },
  { text: "легкая тревога", family: "страх", valence: -0.6 },
  { text: "хочется тишины", desire: "тишина" },
  { text: "нежность и благодарность", family: "нежность", valence: 1.0 },
  { text: "усталость в теле", family: "тело", valence: -0.4 },
  { text: "хочу быть услышанным", desire: "быть услышанным" },
  { text: "радость присутствия", family: "радость", valence: 0.9 },
  { text: "живость и трепет", family: "живость", valence: 0.7 },
  { text: "хочу замедления", desire: "замедление" },
  { text: "грусть уходящего дня", family: "грусть", valence: -0.5 },
];
