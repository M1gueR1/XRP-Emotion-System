type EmotionSoundRequest = {
  emotionId: number;
  emotionName?: string | null;
};


type ToneStep = {
  frequency: number;
  startSeconds: number;
  durationSeconds: number;
  gain: number;
  waveform:
    | "sine"
    | "square"
    | "sawtooth"
    | "triangle";
};


type ActiveVoice = {
  oscillator: OscillatorNode;
  gainNode: GainNode;
};




const HAPPY_PATTERN: ToneStep[] = [
  {
    frequency: 523.25,
    startSeconds: 0,
    durationSeconds: 0.14,
    gain: 0.42,
    waveform: "sine",
  },
  {
    frequency: 659.25,
    startSeconds: 0.12,
    durationSeconds: 0.22,
    gain: 0.48,
    waveform: "sine",
  },
];


const NERVOUS_PATTERN: ToneStep[] = [
  {
    frequency: 440,
    startSeconds: 0,
    durationSeconds: 0.09,
    gain: 0.25,
    waveform: "triangle",
  },
  {
    frequency: 392,
    startSeconds: 0.08,
    durationSeconds: 0.09,
    gain: 0.25,
    waveform: "triangle",
  },
  {
    frequency: 440,
    startSeconds: 0.16,
    durationSeconds: 0.09,
    gain: 0.25,
    waveform: "triangle",
  },
  {
    frequency: 392,
    startSeconds: 0.24,
    durationSeconds: 0.11,
    gain: 0.25,
    waveform: "triangle",
  },
];


const LOST_PATTERN: ToneStep[] = [
  {
    frequency: 392,
    startSeconds: 0,
    durationSeconds: 0.18,
    gain: 0.34,
    waveform: "sine",
  },
  {
    frequency: 329.63,
    startSeconds: 0.15,
    durationSeconds: 0.20,
    gain: 0.32,
    waveform: "sine",
  },
  {
    frequency: 261.63,
    startSeconds: 0.32,
    durationSeconds: 0.28,
    gain: 0.30,
    waveform: "sine",
  },
];


const EXCITED_PATTERN: ToneStep[] = [
  {
    frequency: 523.25,
    startSeconds: 0,
    durationSeconds: 0.10,
    gain: 0.40,
    waveform: "triangle",
  },
  {
    frequency: 659.25,
    startSeconds: 0.09,
    durationSeconds: 0.11,
    gain: 0.42,
    waveform: "triangle",
  },
  {
    frequency: 783.99,
    startSeconds: 0.18,
    durationSeconds: 0.12,
    gain: 0.45,
    waveform: "triangle",
  },
  {
    frequency: 987.77,
    startSeconds: 0.28,
    durationSeconds: 0.22,
    gain: 0.46,
    waveform: "triangle",
  },
];


function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(
    Math.max(value, minimum),
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


function createFallbackPattern(
  emotionId: number
): ToneStep[] {
  /*
   * Give unknown custom emotions a deterministic
   * two-note sound based on their ID.
   */
  const baseFrequency =
    330 + (
      Math.abs(emotionId) % 8
    ) * 28;

  return [
    {
      frequency: baseFrequency,
      startSeconds: 0,
      durationSeconds: 0.13,
      gain: 0.32,
      waveform: "sine",
    },
    {
      frequency:
        baseFrequency * 1.25,
      startSeconds: 0.11,
      durationSeconds: 0.18,
      gain: 0.36,
      waveform: "sine",
    },
  ];
}


function getEmotionPattern(
  emotionId: number,
  emotionName?: string | null
): ToneStep[] | null {
  const normalizedName =
    normalizeEmotionName(
      emotionName
    );

  if (
    normalizedName === "idle" ||
    emotionId === 0
  ) {
    return null;
  }

  if (
    [
      "excited",
      "celebration",
      "delighted",
      "ready_to_race",
    ].includes(normalizedName)
  ) {
    return EXCITED_PATTERN;
  }

  if (
    [
      "happy",
      "chuckled",
      "amazed",
      "love_it",
      "in_love",
    ].includes(normalizedName)
  ) {
    return HAPPY_PATTERN;
  }

  if (
    [
      "puzzled",
      "frustrated",
      "upset",
    ].includes(normalizedName)
  ) {
    return NERVOUS_PATTERN;
  }

  if (
    [
      "sad",
      "angry",
    ].includes(normalizedName)
  ) {
    return LOST_PATTERN;
  }

  return createFallbackPattern(
    emotionId
  );
}


class EmotionSoundManager {
  private audioContext:
    AudioContext | null = null;

  private masterGain:
    GainNode | null = null;

  private activeVoices =
    new Set<ActiveVoice>();

  private volume = 0.35;

  private activeAudioSource:
  AudioBufferSourceNode | null = null;

    private audioBufferCache =
    new WeakMap<
        Blob,
        Promise<AudioBuffer>
    >();

    private playRequestId = 0;


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


  stop(
    fadeSeconds = 0.03
  ): void {

    this.playRequestId += 1;

    if (
    this.activeAudioSource !== null
    ) {
    try {
        this.activeAudioSource.stop();
    } catch {
        // The source may already have finished.
    }

    try {
        this.activeAudioSource.disconnect();
    } catch {
        // It may already be disconnected.
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
          now + fadeSeconds + 0.01
        );
      } catch {
        /*
         * A source that already ended cannot
         * always be stopped a second time.
         */
      }
    }

    this.activeVoices.clear();
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

    const pattern =
      getEmotionPattern(
        emotionId,
        emotionName
      );

    this.stop();

    if (pattern === null) {
      return true;
    }

    const context =
      this.audioContext;

    const startTime =
      context.currentTime + 0.02;

    for (const step of pattern) {
      const oscillator =
        context.createOscillator();

      const gainNode =
        context.createGain();

      oscillator.type =
        step.waveform;

      oscillator.frequency.setValueAtTime(
        step.frequency,
        startTime +
          step.startSeconds
      );

      const noteStart =
        startTime +
        step.startSeconds;

      const noteEnd =
        noteStart +
        step.durationSeconds;

      const attackEnd =
        Math.min(
          noteStart + 0.015,
          noteEnd
        );

      gainNode.gain.setValueAtTime(
        0.0001,
        noteStart
      );

      gainNode.gain
        .linearRampToValueAtTime(
          step.gain,
          attackEnd
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

        oscillator.disconnect();
        gainNode.disconnect();
      };

      oscillator.start(
        noteStart
      );

      oscillator.stop(
        noteEnd + 0.02
      );
    }

    return true;
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
        * Another emotion may have started while
        * this file was being decoded.
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

        /*
        * For now, custom sounds play once whenever
        * the emotion is activated.
        */
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
  }
}


export default EmotionSoundManager;