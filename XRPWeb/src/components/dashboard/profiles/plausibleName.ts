const BLOCKED_NAME_WORDS = new Set([
  "a", "an", "the", "i", "me", "my", "mine", "you", "your", "he",
  "she", "they", "we", "it", "of", "on", "in", "at", "to", "for",
  "with", "about", "from", "de", "as", "am", "is", "are", "be", "been",
  "being", "really", "very", "so", "just", "kinda", "kind", "super",
  "happy", "sad", "excited", "upset", "angry", "mad", "tired", "stressed",
  "worried", "nervous", "lonely", "alone", "fine", "good", "bad", "okay",
  "ok", "hungry", "frustrated", "ready", "here", "there", "studying",
  "feeling", "working", "learning", "going", "playing", "practicing",
  "colombia", "robot", "student", "profile", "developer", "engineer",
  "engineering", "software", "programmer", "teacher", "doctor", "nurse",
  "artist", "scientist", "designer", "captain", "volunteer", "player",
  "organized", "patient", "creative", "kind", "curious", "responsible",
  "helpful", "hardworking",
  "called",
]);

const BLOCKED_NAME_PHRASE =
  /\b(?:software|engineering|engineer|student|developer|programmer|teacher|doctor|nurse|artist|scientist|designer|from|studying|feeling|working|learning|playing|happy|sad|tired|hungry|angry|worried|nervous|excited|soccer player|team captain)\b/i;

const NAME_CHARACTERS = /^[A-Za-z\u00c0-\u024f][A-Za-z\u00c0-\u024f' -]{1,39}$/;

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The single authoritative validator for student display names. */
export function isPlausibleStudentName(value: string): boolean {
  const clean = value.replace(/\s+/g, " ").trim();
  const normalized = normalizeName(clean);
  const words = normalized.split(" ").filter(Boolean);

  return (
    clean.length >= 2 &&
    clean.length <= 40 &&
    NAME_CHARACTERS.test(clean) &&
    words.length >= 1 &&
    words.length <= 3 &&
    !BLOCKED_NAME_PHRASE.test(clean) &&
    !words.some((word) => BLOCKED_NAME_WORDS.has(word))
  );
}

export function cleanStudentName(value: string): string | null {
  const clean = value.replace(/\s+/g, " ").trim();
  return isPlausibleStudentName(clean) ? clean : null;
}
