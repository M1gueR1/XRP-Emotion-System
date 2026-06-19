type EmotionSoundRequest = {
  emotionId: number;
  emotionName?: string | null;
};


type Waveform =
  | "sine"
  | "square"
  | "sawtooth"
  | "triangle";


type DroidContour =
  | "up"
  | "down"
  | "zigzag"
  | "question"
  | "burst"
  | "warm";


type DroidSoundProfile = {
  minimumFrequency: number;
  maximumFrequency: number;

  minimumChirps: number;
  maximumChirps: number;

  minimumDurationSeconds: number;
  maximumDurationSeconds: number;

  minimumGapSeconds: number;
  maximumGapSeconds: number;

  gain: number;

  waveforms:
    readonly Waveform[];

  contour: DroidContour;

  wobbleDepth: number;
};


type DroidToneStep = {
  startFrequency: number;
  endFrequency: number;

  startSeconds: number;
  durationSeconds: number;

  gain: number;
  waveform: Waveform;

  wobbleDepth: number;
  wobbleCycles: number;

  detuneCents: number;
};


type ActiveVoice = {
  oscillator: OscillatorNode;
  gainNode: GainNode;
};


const DROID_VARIATION_COUNT = 5;


/*
 * Original electronic sound profiles.
 *
 * Each profile produces five deterministic but
 * different variations. They use synthetic pitch
 * bends and do not contain copyrighted samples.
 */
const OFFICIAL_DROID_PROFILES = {
  happy: {
    minimumFrequency: 700,
    maximumFrequency: 1900,
    minimumChirps: 3,
    maximumChirps: 5,
    minimumDurationSeconds: 0.045,
    maximumDurationSeconds: 0.10,
    minimumGapSeconds: 0.01,
    maximumGapSeconds: 0.055,
    gain: 0.24,
    waveforms: [
      "sine",
      "triangle",
    ],
    contour: "up",
    wobbleDepth: 0.035,
  },

  chuckled: {
    minimumFrequency: 850,
    maximumFrequency: 2300,
    minimumChirps: 5,
    maximumChirps: 8,
    minimumDurationSeconds: 0.025,
    maximumDurationSeconds: 0.065,
    minimumGapSeconds: 0.005,
    maximumGapSeconds: 0.03,
    gain: 0.20,
    waveforms: [
      "triangle",
      "square",
    ],
    contour: "zigzag",
    wobbleDepth: 0.075,
  },

  excited: {
    minimumFrequency: 750,
    maximumFrequency: 2600,
    minimumChirps: 5,
    maximumChirps: 8,
    minimumDurationSeconds: 0.025,
    maximumDurationSeconds: 0.075,
    minimumGapSeconds: 0.005,
    maximumGapSeconds: 0.035,
    gain: 0.23,
    waveforms: [
      "triangle",
      "square",
    ],
    contour: "burst",
    wobbleDepth: 0.09,
  },

  celebration: {
    minimumFrequency: 650,
    maximumFrequency: 2700,
    minimumChirps: 6,
    maximumChirps: 10,
    minimumDurationSeconds: 0.025,
    maximumDurationSeconds: 0.08,
    minimumGapSeconds: 0.005,
    maximumGapSeconds: 0.04,
    gain: 0.22,
    waveforms: [
      "triangle",
      "square",
      "sine",
    ],
    contour: "burst",
    wobbleDepth: 0.085,
  },

  amazed: {
    minimumFrequency: 450,
    maximumFrequency: 2450,
    minimumChirps: 3,
    maximumChirps: 5,
    minimumDurationSeconds: 0.065,
    maximumDurationSeconds: 0.145,
    minimumGapSeconds: 0.015,
    maximumGapSeconds: 0.07,
    gain: 0.23,
    waveforms: [
      "sine",
      "triangle",
    ],
    contour: "up",
    wobbleDepth: 0.045,
  },

  puzzled: {
    minimumFrequency: 450,
    maximumFrequency: 1850,
    minimumChirps: 3,
    maximumChirps: 6,
    minimumDurationSeconds: 0.055,
    maximumDurationSeconds: 0.125,
    minimumGapSeconds: 0.02,
    maximumGapSeconds: 0.09,
    gain: 0.21,
    waveforms: [
      "triangle",
      "sine",
    ],
    contour: "question",
    wobbleDepth: 0.06,
  },

  frustrated: {
    minimumFrequency: 230,
    maximumFrequency: 1450,
    minimumChirps: 5,
    maximumChirps: 8,
    minimumDurationSeconds: 0.025,
    maximumDurationSeconds: 0.075,
    minimumGapSeconds: 0.005,
    maximumGapSeconds: 0.035,
    gain: 0.18,
    waveforms: [
      "square",
      "sawtooth",
      "triangle",
    ],
    contour: "zigzag",
    wobbleDepth: 0.12,
  },

  upset: {
    minimumFrequency: 250,
    maximumFrequency: 1100,
    minimumChirps: 3,
    maximumChirps: 5,
    minimumDurationSeconds: 0.07,
    maximumDurationSeconds: 0.155,
    minimumGapSeconds: 0.02,
    maximumGapSeconds: 0.075,
    gain: 0.20,
    waveforms: [
      "triangle",
      "sine",
    ],
    contour: "down",
    wobbleDepth: 0.045,
  },

  sad: {
    minimumFrequency: 170,
    maximumFrequency: 850,
    minimumChirps: 2,
    maximumChirps: 4,
    minimumDurationSeconds: 0.11,
    maximumDurationSeconds: 0.23,
    minimumGapSeconds: 0.035,
    maximumGapSeconds: 0.11,
    gain: 0.21,
    waveforms: [
      "sine",
      "triangle",
    ],
    contour: "down",
    wobbleDepth: 0.025,
  },

  angry: {
    minimumFrequency: 140,
    maximumFrequency: 950,
    minimumChirps: 5,
    maximumChirps: 8,
    minimumDurationSeconds: 0.025,
    maximumDurationSeconds: 0.07,
    minimumGapSeconds: 0.002,
    maximumGapSeconds: 0.03,
    gain: 0.14,
    waveforms: [
      "sawtooth",
      "square",
    ],
    contour: "burst",
    wobbleDepth: 0.14,
  },

  love_it: {
    minimumFrequency: 550,
    maximumFrequency: 1750,
    minimumChirps: 3,
    maximumChirps: 5,
    minimumDurationSeconds: 0.075,
    maximumDurationSeconds: 0.15,
    minimumGapSeconds: 0.015,
    maximumGapSeconds: 0.065,
    gain: 0.22,
    waveforms: [
      "sine",
      "triangle",
    ],
    contour: "warm",
    wobbleDepth: 0.035,
  },

  in_love: {
    minimumFrequency: 450,
    maximumFrequency: 1650,
    minimumChirps: 4,
    maximumChirps: 6,
    minimumDurationSeconds: 0.075,
    maximumDurationSeconds: 0.16,
    minimumGapSeconds: 0.015,
    maximumGapSeconds: 0.07,
    gain: 0.21,
    waveforms: [
      "sine",
      "triangle",
    ],
    contour: "warm",
    wobbleDepth: 0.04,
  },

  delighted: {
    minimumFrequency: 850,
    maximumFrequency: 2350,
    minimumChirps: 4,
    maximumChirps: 7,
    minimumDurationSeconds: 0.035,
    maximumDurationSeconds: 0.085,
    minimumGapSeconds: 0.005,
    maximumGapSeconds: 0.04,
    gain: 0.22,
    waveforms: [
      "triangle",
      "sine",
    ],
    contour: "up",
    wobbleDepth: 0.065,
  },

  ready_to_race: {
    minimumFrequency: 300,
    maximumFrequency: 2350,
    minimumChirps: 6,
    maximumChirps: 9,
    minimumDurationSeconds: 0.02,
    maximumDurationSeconds: 0.065,
    minimumGapSeconds: 0.002,
    maximumGapSeconds: 0.025,
    gain: 0.19,
    waveforms: [
      "square",
      "triangle",
    ],
    contour: "burst",
    wobbleDepth: 0.11,
  },
} satisfies Record<
  string,
  DroidSoundProfile
>;

type OfficialDroidEmotion =
  keyof typeof OFFICIAL_DROID_PROFILES;


function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(
    Math.max(
      value,
      minimum
    ),
    maximum
  );
}


function normalizeEmotionName(
  emotionName?: string | null
): string {
  return (
    emotionName
      ?.trim()
      .toLowerCase() ?? ""
  );
}


function hashString(
  value: string
): number {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^= value.charCodeAt(
      index
    );

    hash = Math.imul(
      hash,
      16777619
    );
  }

  return hash >>> 0;
}


/*
 * Seeded random generator.
 *
 * This makes the five variations stable:
 * variation 1 always sounds like variation 1,
 * but the selected variation changes randomly.
 */
function createSeededRandom(
  seed: number
): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let value = state;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1
    );

    value ^=
      value +
      Math.imul(
        value ^ (value >>> 7),
        value | 61
      );

    return (
      (
        value ^
        (value >>> 14)
      ) >>> 0
    ) / 4294967296;
  };
}


function randomBetween(
  random: () => number,
  minimum: number,
  maximum: number
): number {
  return (
    minimum +
    random() *
    (
      maximum -
      minimum
    )
  );
}


function randomInteger(
  random: () => number,
  minimum: number,
  maximum: number
): number {
  return Math.floor(
    randomBetween(
      random,
      minimum,
      maximum + 1
    )
  );
}


function pickRandom<T>(
  random: () => number,
  values: readonly T[]
): T {
  const index = Math.min(
    values.length - 1,
    Math.floor(
      random() *
      values.length
    )
  );

  return values[index];
}


function createFallbackProfile(
  emotionId: number
): DroidSoundProfile {
  const offset =
    (
      Math.abs(emotionId) % 8
    ) * 45;

  return {
    minimumFrequency:
      500 + offset,

    maximumFrequency:
      1700 + offset,

    minimumChirps: 3,
    maximumChirps: 5,

    minimumDurationSeconds:
      0.04,

    maximumDurationSeconds:
      0.11,

    minimumGapSeconds:
      0.01,

    maximumGapSeconds:
      0.06,

    gain: 0.20,

    waveforms: [
      "triangle",
      "sine",
    ],

    contour: "zigzag",

    wobbleDepth: 0.055,
  };
}


function createPitchPair(
  profile: DroidSoundProfile,
  chirpIndex: number,
  chirpCount: number,
  random: () => number
): {
  startFrequency: number;
  endFrequency: number;
} {
  const range =
    profile.maximumFrequency -
    profile.minimumFrequency;

  const lowerMiddle =
    profile.minimumFrequency +
    range * 0.42;

  const upperMiddle =
    profile.minimumFrequency +
    range * 0.58;

  const low = randomBetween(
    random,
    profile.minimumFrequency,
    lowerMiddle
  );

  const high = randomBetween(
    random,
    upperMiddle,
    profile.maximumFrequency
  );


  switch (profile.contour) {
    case "up":
      return {
        startFrequency: low,
        endFrequency: high,
      };


    case "down":
      return {
        startFrequency: high,
        endFrequency: low,
      };


    case "zigzag":
      return chirpIndex % 2 === 0
        ? {
          startFrequency: low,
          endFrequency: high,
        }
        : {
          startFrequency: high,
          endFrequency: low,
        };


    case "question": {
      const isLast =
        chirpIndex ===
        chirpCount - 1;

      if (isLast) {
        return {
          startFrequency:
            profile.minimumFrequency +
            range * 0.35,

          endFrequency:
            profile.maximumFrequency,
        };
      }

      return chirpIndex % 2 === 0
        ? {
          startFrequency: high,
          endFrequency:
            lowerMiddle,
        }
        : {
          startFrequency: low,
          endFrequency:
            upperMiddle,
        };
    }


    case "warm": {
      const warmLow =
        profile.minimumFrequency +
        range * 0.2;

      const warmHigh =
        profile.minimumFrequency +
        range * 0.72;

      return chirpIndex % 3 === 2
        ? {
          startFrequency:
            warmHigh,

          endFrequency:
            warmLow,
        }
        : {
          startFrequency:
            warmLow,

          endFrequency:
            warmHigh,
        };
    }


    case "burst":
    default: {
      let startFrequency =
        randomBetween(
          random,
          profile.minimumFrequency,
          profile.maximumFrequency
        );

      let endFrequency =
        randomBetween(
          random,
          profile.minimumFrequency,
          profile.maximumFrequency
        );

      /*
       * Avoid almost-flat tones. Droid chirps
       * sound better with a noticeable bend.
       */
      const minimumDifference =
        range * 0.22;

      if (
        Math.abs(
          endFrequency -
          startFrequency
        ) < minimumDifference
      ) {
        if (
          startFrequency <
          profile.minimumFrequency +
          range / 2
        ) {
          endFrequency =
            Math.min(
              profile.maximumFrequency,
              startFrequency +
              minimumDifference
            );
        } else {
          endFrequency =
            Math.max(
              profile.minimumFrequency,
              startFrequency -
              minimumDifference
            );
        }
      }

      return {
        startFrequency,
        endFrequency,
      };
    }
  }
}


function createDroidPattern(
  emotionKey: string,
  profile: DroidSoundProfile,
  variationIndex: number
): DroidToneStep[] {
  const seed =
    (
      hashString(emotionKey) ^
      Math.imul(
        variationIndex + 1,
        0x9e3779b1
      )
    ) >>> 0;

  const random =
    createSeededRandom(seed);

  const chirpCount =
    randomInteger(
      random,
      profile.minimumChirps,
      profile.maximumChirps
    );

  const steps:
    DroidToneStep[] = [];

  let currentTime = 0;


  for (
    let chirpIndex = 0;
    chirpIndex < chirpCount;
    chirpIndex += 1
  ) {
    const durationSeconds =
      randomBetween(
        random,
        profile
          .minimumDurationSeconds,

        profile
          .maximumDurationSeconds
      );

    const gapSeconds =
      randomBetween(
        random,
        profile.minimumGapSeconds,
        profile.maximumGapSeconds
      );

    const pitch =
      createPitchPair(
        profile,
        chirpIndex,
        chirpCount,
        random
      );

    const variationEnergy =
      0.90 +
      (
        variationIndex *
        0.025
      );

    steps.push({
      startFrequency:
        pitch.startFrequency,

      endFrequency:
        pitch.endFrequency,

      startSeconds:
        currentTime,

      durationSeconds,

      gain:
        profile.gain *
        variationEnergy *
        randomBetween(
          random,
          0.82,
          1
        ),

      waveform:
        pickRandom(
          random,
          profile.waveforms
        ),

      wobbleDepth:
        profile.wobbleDepth *
        randomBetween(
          random,
          0.65,
          1.2
        ),

      wobbleCycles:
        randomBetween(
          random,
          1,
          4.5
        ),

      detuneCents:
        randomBetween(
          random,
          -24,
          24
        ),
    });

    currentTime +=
      durationSeconds +
      gapSeconds;
  }

  return steps;
}


/*
 * Creates a pitch-bend curve with a small
 * electronic wobble.
 */
function createFrequencyCurve(
  step: DroidToneStep
): Float32Array {
  const pointCount = 32;

  const curve =
    new Float32Array(
      pointCount
    );

  for (
    let index = 0;
    index < pointCount;
    index += 1
  ) {
    const progress =
      index /
      (
        pointCount - 1
      );

    const baseFrequency =
      step.startFrequency +
      (
        step.endFrequency -
        step.startFrequency
      ) *
      progress;

    const wobble =
      Math.sin(
        progress *
        Math.PI *
        2 *
        step.wobbleCycles
      ) *
      step.wobbleDepth;

    curve[index] =
      Math.max(
        30,
        baseFrequency *
        (
          1 + wobble
        )
      );
  }

  return curve;
}


class EmotionSoundManager {
  private audioContext:
    AudioContext | null = null;

  private masterGain:
    GainNode | null = null;

  private activeVoices =
    new Set<ActiveVoice>();

  private activeAudioSource:
    AudioBufferSourceNode | null =
      null;

  private audioBufferCache =
    new WeakMap<
      Blob,
      Promise<AudioBuffer>
    >();

  private lastVariationByEmotion =
    new Map<string, number>();

  private playRequestId = 0;

  private volume = 0.35;


  async enable():
    Promise<boolean> {
    try {
      if (
        this.audioContext === null ||
        this.audioContext.state ===
          "closed"
      ) {
        this.audioContext =
          new AudioContext();

        this.masterGain =
          this.audioContext
            .createGain();

        this.masterGain.gain.value =
          this.volume;

        this.masterGain.connect(
          this.audioContext.destination
        );
      }

      if (
        this.audioContext.state ===
        "suspended"
      ) {
        await this.audioContext.resume();
      }

      return (
        this.audioContext.state ===
        "running"
      );
    } catch (error) {
      console.error(
        "Could not enable emotion sounds:",
        error
      );

      return false;
    }
  }


  isReady(): boolean {
    return (
      this.audioContext !== null &&
      this.masterGain !== null &&
      this.audioContext.state ===
        "running"
    );
  }


  setVolume(
    nextVolume: number
  ): void {
    this.volume = clamp(
      nextVolume,
      0,
      1
    );

    if (
      this.audioContext === null ||
      this.masterGain === null
    ) {
      return;
    }

    const now =
      this.audioContext.currentTime;

    this.masterGain.gain
      .cancelScheduledValues(now);

    this.masterGain.gain
      .setTargetAtTime(
        this.volume,
        now,
        0.015
      );
  }


  private chooseVariation(
    emotionKey: string
  ): number {
    const previousVariation =
      this.lastVariationByEmotion.get(
        emotionKey
      );

    let nextVariation =
      Math.floor(
        Math.random() *
        DROID_VARIATION_COUNT
      );

    /*
     * Do not repeat the same variation
     * twice consecutively.
     */
    if (
      previousVariation !== undefined &&
      nextVariation ===
        previousVariation
    ) {
      const offset =
        1 +
        Math.floor(
          Math.random() *
          (
            DROID_VARIATION_COUNT -
            1
          )
        );

      nextVariation =
        (
          previousVariation +
          offset
        ) %
        DROID_VARIATION_COUNT;
    }

    this.lastVariationByEmotion.set(
      emotionKey,
      nextVariation
    );

    return nextVariation;
  }


  stop(
    fadeSeconds = 0.025
  ): void {
    this.playRequestId += 1;

    if (
      this.activeAudioSource !== null
    ) {
      try {
        this.activeAudioSource.stop();
      } catch {
        // Source may already have ended.
      }

      try {
        this.activeAudioSource
          .disconnect();
      } catch {
        // Source may already be disconnected.
      }

      this.activeAudioSource = null;
    }

    if (
      this.audioContext === null
    ) {
      this.activeVoices.clear();
      return;
    }

    const now =
      this.audioContext.currentTime;

    for (
      const voice
      of this.activeVoices
    ) {
      try {
        voice.gainNode.gain
          .cancelScheduledValues(now);

        voice.gainNode.gain
          .setValueAtTime(
            Math.max(
              voice.gainNode.gain.value,
              0.0001
            ),
            now
          );

        voice.gainNode.gain
          .linearRampToValueAtTime(
            0.0001,
            now + fadeSeconds
          );

        voice.oscillator.stop(
          now +
          fadeSeconds +
          0.01
        );
      } catch {
        // Oscillator may already have ended.
      }
    }

    this.activeVoices.clear();
  }


  playEmotion({
    emotionId,
    emotionName,
  }: EmotionSoundRequest): boolean {
    if (
      !this.isReady() ||
      this.audioContext === null ||
      this.masterGain === null
    ) {
      return false;
    }

    const normalizedName =
      normalizeEmotionName(
        emotionName
      );

    this.stop();

    /*
     * Idle remains silent.
     */
    if (
      normalizedName === "idle" ||
      emotionId === 0
    ) {
      return true;
    }

    const profile =
      normalizedName in
      OFFICIAL_DROID_PROFILES
        ? OFFICIAL_DROID_PROFILES[
            normalizedName as OfficialDroidEmotion
          ]
        : createFallbackProfile(
            emotionId
          );

    const emotionKey =
      normalizedName ||
      `emotion_${emotionId}`;

    const variationIndex =
      this.chooseVariation(
        emotionKey
      );

    const pattern =
      createDroidPattern(
        emotionKey,
        profile,
        variationIndex
      );

    const context =
      this.audioContext;

    const startTime =
      context.currentTime +
      0.025;


    for (const step of pattern) {
      const oscillator =
        context.createOscillator();

      const gainNode =
        context.createGain();

      oscillator.type =
        step.waveform;

      const noteStart =
        startTime +
        step.startSeconds;

      const noteEnd =
        noteStart +
        step.durationSeconds;

      const attackEnd =
        Math.min(
          noteStart + 0.008,
          noteEnd
        );

      const releaseStart =
        Math.max(
          attackEnd,
          noteEnd - 0.018
        );

      oscillator.detune
        .setValueAtTime(
          step.detuneCents,
          noteStart
        );

      oscillator.frequency
        .setValueCurveAtTime(
          createFrequencyCurve(
            step
          ),
          noteStart,
          step.durationSeconds
        );

      gainNode.gain
        .setValueAtTime(
          0.0001,
          noteStart
        );

      gainNode.gain
        .linearRampToValueAtTime(
          step.gain,
          attackEnd
        );

      gainNode.gain
        .setValueAtTime(
          step.gain,
          releaseStart
        );

      gainNode.gain
        .exponentialRampToValueAtTime(
          0.0001,
          noteEnd
        );

      oscillator.connect(
        gainNode
      );

      gainNode.connect(
        this.masterGain
      );

      const voice: ActiveVoice = {
        oscillator,
        gainNode,
      };

      this.activeVoices.add(
        voice
      );

      oscillator.onended = () => {
        this.activeVoices.delete(
          voice
        );

        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch {
          // Already disconnected.
        }
      };

      oscillator.start(
        noteStart
      );

      oscillator.stop(
        noteEnd + 0.015
      );
    }


    console.debug(
      "Droid emotion sound:",
      {
        emotion:
          emotionKey,

        variation:
          variationIndex + 1,

        totalVariations:
          DROID_VARIATION_COUNT,

        chirps:
          pattern.length,
      }
    );

    return true;
  }


  private getAudioBuffer(
    blob: Blob
  ): Promise<AudioBuffer> {
    const cached =
      this.audioBufferCache.get(
        blob
      );

    if (cached) {
      return cached;
    }

    if (
      this.audioContext === null
    ) {
      return Promise.reject(
        new Error(
          "AudioContext is unavailable"
        )
      );
    }

    const context =
      this.audioContext;

    const promise =
      blob
        .arrayBuffer()
        .then((arrayBuffer) =>
          context.decodeAudioData(
            arrayBuffer.slice(0)
          )
        );

    this.audioBufferCache.set(
      blob,
      promise
    );

    return promise;
  }


  async playCustomAudio(
    blob: Blob
  ): Promise<boolean> {
    if (
      !this.isReady() ||
      this.audioContext === null ||
      this.masterGain === null
    ) {
      return false;
    }

    this.stop();

    const requestId =
      this.playRequestId;

    try {
      const audioBuffer =
        await this.getAudioBuffer(
          blob
        );

      /*
       * Another emotion may start while
       * the custom audio is being decoded.
       */
      if (
        requestId !==
        this.playRequestId
      ) {
        return false;
      }

      const source =
        this.audioContext
          .createBufferSource();

      source.buffer =
        audioBuffer;

      source.loop = false;

      source.connect(
        this.masterGain
      );

      source.onended = () => {
        if (
          this.activeAudioSource ===
          source
        ) {
          this.activeAudioSource =
            null;
        }

        try {
          source.disconnect();
        } catch {
          // Already disconnected.
        }
      };

      this.activeAudioSource =
        source;

      source.start();

      return true;
    } catch (error) {
      console.error(
        "Could not play custom " +
          "emotion audio:",
        error
      );

      return false;
    }
  }


  async close():
    Promise<void> {
    this.stop();

    if (
      this.audioContext !== null &&
      this.audioContext.state !==
        "closed"
    ) {
      await this.audioContext.close();
    }

    this.audioContext = null;
    this.masterGain = null;

    this.activeVoices.clear();

    this.lastVariationByEmotion
      .clear();
  }
}


export default EmotionSoundManager;