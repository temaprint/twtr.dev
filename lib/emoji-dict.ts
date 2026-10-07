// Fixed dictionary for identity fingerprints.
// Rules: single codepoint emoji only (no ZWJ sequences, no skin tones),
// visually distinct, well-supported across platforms.
// DO NOT reorder or edit — fingerprints are deterministic against this list.
export const EMOJI: readonly string[] = Object.freeze([
  "🦊", "🐼", "🐸", "🐙", "🦉", "🐝", "🦋", "🐢",
  "🐬", "🦄", "🐳", "🦖", "🦕", "🦩", "🐧", "🦔",
  "🐉", "🦁", "🐯", "🐨", "🐷", "🐵", "🐺", "🐴",
  "🍕", "🍎", "🍇", "🌮", "🍩", "🥑", "🍓", "🍒",
  "🍋", "🍉", "🍄", "🚀", "🎸", "🌵", "🌲", "🌻",
  "🌙", "⭐", "🔥", "🌊", "🌈", "🍁", "🌴", "🍀",
  "🌸", "🍂", "👻", "👽", "🎃", "💎", "🔑", "💡",
  "🔮", "🎲", "🪐", "⛵", "🏆", "🎯", "🎨", "🎧",
]);
