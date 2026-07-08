const TOKEN_REPLACEMENTS:
  Record<string, string> = {
    whad: "what",
    whta: "what",
    waht: "what",
    wat: "what",
    wut: "what",
    whats: "what is",
    wht: "what",
    knwo: "know",
    konw: "know",
    rember: "remember",
    remeber: "remember",
    remebmber: "remember",
    abotu: "about",
    yuo: "you",
    yuor: "your",
    teh: "the",
    taht: "that",
    thta: "that",
    adn: "and",
    becuase: "because",
    becasue: "because",
    freind: "friend",
    firend: "friend",
    happi: "happy",
    sda: "sad",
    exicted: "excited",
    excitd: "excited",
    frustated: "frustrated",
    vegtables: "vegetables",
    videogames: "video games",
  };


const PHRASE_REPLACEMENTS:
  Array<{
    pattern: RegExp;
    replacement: string;
  }> = [
    {
      pattern:
        /\bwhad\s+do\s+you\s+know\s+about\s+me\b/gi,
      replacement:
        "what do you know about me",
    },
    {
      pattern:
        /\bwhat\s+do\s+yuo\s+know\s+about\s+me\b/gi,
      replacement:
        "what do you know about me",
    },
    {
      pattern:
        /\bdo\s+i\s+lik\s+/gi,
      replacement:
        "do i like ",
    },
    {
      pattern:
        /\bhow\s+are\s+u\b/gi,
      replacement:
        "how are you",
    },
  ];


export function normalizeChatInputForReasoning(
  input: string
): string {
  let text =
    input.replace(/\s+/g, " ").trim();

  for (const replacement of PHRASE_REPLACEMENTS) {
    text =
      text.replace(
        replacement.pattern,
        replacement.replacement
      );
  }

  text = text
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) {
        return part;
      }

      const lower =
        part
          .toLowerCase()
          .replace(/[^a-z0-9ñ]/gi, "");

      const replacement =
        TOKEN_REPLACEMENTS[lower];

      if (!replacement) {
        return part;
      }

      const prefix =
        part.match(/^[^a-z0-9ñ]+/i)?.[0] ?? "";

      const suffix =
        part.match(/[^a-z0-9ñ]+$/i)?.[0] ?? "";

      return `${prefix}${replacement}${suffix}`;
    })
    .join("");

  return text.replace(/\s+/g, " ").trim();
}


export function didNormalizeChatInput(
  original: string,
  normalized: string
): boolean {
  return (
    original.trim().toLowerCase() !==
    normalized.trim().toLowerCase()
  );
}
