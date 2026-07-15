import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  RefObject,
} from "react";

import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";


export type FacePresenceStatus =
  | "idle"
  | "loading"
  | "ready"
  | "running"
  | "error";


export type VisionExpressionSignal =
  | "no_face"
  | "neutral"
  | "happy"
  | "surprised"
  | "tongue_out"
  | "sad"
  | "upset";


export type FaceExpressionScores = {
  smile: number;
  surprise: number;
  tongueOut: number;
  sad: number;
  sadMouth: number;
  sadEyes: number;
  upset: number;
  upsetBrow: number;
  upsetTension: number;
};


export type UseFacePresenceDetectorOptions = {
  videoRef: RefObject<HTMLVideoElement>;
  isEnabled: boolean;
};


export type UseFacePresenceDetectorResult = {
  status: FacePresenceStatus;
  errorMessage: string;
  isModelReady: boolean;
  isDetecting: boolean;
  faceDetected: boolean;
  faceCount: number;
  lastDetectedAt: number | null;
  expressionSignal: VisionExpressionSignal;
  expressionConfidence: number;
  expressionScores: FaceExpressionScores;
};


const VISION_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";


const EMPTY_EXPRESSION_SCORES:
  FaceExpressionScores = {
    smile: 0,
    surprise: 0,
    tongueOut: 0,
    sad: 0,
    sadMouth: 0,
    sadEyes: 0,
    upset: 0,
    upsetBrow: 0,
    upsetTension: 0,
  };


let sharedFaceLandmarkerPromise:
  Promise<FaceLandmarker> | null = null;


async function loadFaceLandmarker():
  Promise<FaceLandmarker> {
  if (!sharedFaceLandmarkerPromise) {
    sharedFaceLandmarkerPromise =
      (async () => {
        const vision =
          await FilesetResolver.forVisionTasks(
            VISION_WASM_URL
          );

        return FaceLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                FACE_LANDMARKER_MODEL_URL,
              delegate: "CPU",
            },

            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes:
              false,
          }
        );
      })();
  }

  return sharedFaceLandmarkerPromise;
}


function clamp01(
  value: number
): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(
    Math.max(
      value,
      0
    ),
    1
  );
}


function average(
  values: number[]
): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce(
    (sum, value) => sum + value,
    0
  ) / values.length;
}


function getBlendshapeScore(
  scoresByName: Map<string, number>,
  names: string[]
): number {
  const values =
    names.map((name) =>
      scoresByName.get(name) ?? 0
    );

  return clamp01(
    average(values)
  );
}


function getMaxBlendshapeScore(
  scoresByName: Map<string, number>,
  names: string[]
): number {
  return clamp01(
    Math.max(
      ...names.map((name) =>
        scoresByName.get(name) ?? 0
      ),
      0
    )
  );
}


function buildScoresByName(
  categories: Array<{
    categoryName: string;
    score: number;
  }>
): Map<string, number> {
  const map =
    new Map<string, number>();

  for (const category of categories) {
    map.set(
      category.categoryName,
      category.score
    );
  }

  return map;
}


function classifyExpressionSignal(
  scores: FaceExpressionScores
): {
  signal: VisionExpressionSignal;
  confidence: number;
} {

  const strongestScore =
    Math.max(
      scores.smile,
      scores.surprise,
      scores.tongueOut,
      scores.sad,
      scores.upset
    );

  const sadPatternDetected =
    scores.sad >= 0.15 &&
    scores.sadMouth >= 0.08 &&
    scores.sadEyes >= 0.04 &&
    scores.upsetBrow < 0.18 &&
    scores.smile < 0.28 &&
    scores.tongueOut < 0.20;

  const strongSadMouthDetected =
    scores.sad >= 0.12 &&
    scores.sadMouth >= 0.16 &&
    scores.upsetBrow < 0.16 &&
    scores.smile < 0.24 &&
    scores.surprise < 0.30;

  const strongSadPatternDetected =
    scores.sad >= 0.13 &&
    scores.sadMouth >= 0.12 &&
    scores.sadEyes >= 0.03 &&
    scores.upsetBrow < 0.18 &&
    scores.smile < 0.22 &&
    scores.surprise < 0.30;

  const upsetPatternDetected =
    scores.upset >= 0.14 &&
    scores.upsetBrow >= 0.10 &&
    scores.upsetTension >= 0.08 &&
    scores.smile < 0.28 &&
    scores.tongueOut < 0.20;

  const strongUpsetBrowDetected =
    scores.upsetBrow >= 0.16 &&
    scores.upsetTension >= 0.05 &&
    scores.smile < 0.24 &&
    scores.surprise < 0.35;

  const upsetDominatesSad =
    scores.upset >= scores.sad * 0.90 &&
    scores.upsetBrow >= 0.12 &&
    scores.upsetTension >= 0.06 &&
    scores.smile < 0.26;

  if (scores.tongueOut >= 0.22) {
    return {
      signal: "tongue_out",
      confidence: scores.tongueOut,
    };
  }

  if (scores.smile >= 0.35) {
    return {
      signal: "happy",
      confidence: scores.smile,
    };
  }

  if (scores.surprise >= 0.32) {
    return {
      signal: "surprised",
      confidence: scores.surprise,
    };
  }

  if (
    upsetPatternDetected ||
    strongUpsetBrowDetected ||
    upsetDominatesSad
  ) {
    return {
      signal: "upset",
      confidence: Math.max(
        scores.upset,
        scores.upsetBrow
      ),
    };
  }

  if (
    sadPatternDetected ||
    strongSadMouthDetected ||
    strongSadPatternDetected
  ) {
    return {
      signal: "sad",
      confidence: scores.sad,
    };
  }

  return {
    signal: "neutral",
    confidence:
      Math.max(
        0,
        1 -
          strongestScore
      ),
  };
}


function extractExpressionScores(
  categories: Array<{
    categoryName: string;
    score: number;
  }>
): FaceExpressionScores {
  const scoresByName =
    buildScoresByName(
      categories
    );

  const smile =
    getBlendshapeScore(
      scoresByName,
      [
        "mouthSmileLeft",
        "mouthSmileRight",
      ]
    );

  const eyesWide =
    getBlendshapeScore(
      scoresByName,
      [
        "eyeWideLeft",
        "eyeWideRight",
      ]
    );

  const browInnerUp =
    getBlendshapeScore(
      scoresByName,
      [
        "browInnerUp",
      ]
    );

  const jawOpen =
    getBlendshapeScore(
      scoresByName,
      [
        "jawOpen",
      ]
    );

  const surprise =
    clamp01(
      eyesWide * 0.45 +
        browInnerUp * 0.35 +
        jawOpen * 0.20
    );

  const browDown =
    getBlendshapeScore(
      scoresByName,
      [
        "browDownLeft",
        "browDownRight",
      ]
    );

  const mouthFrown =
    getBlendshapeScore(
      scoresByName,
      [
        "mouthFrownLeft",
        "mouthFrownRight",
      ]
    );

  const eyeSquint =
    getBlendshapeScore(
      scoresByName,
      [
        "eyeSquintLeft",
        "eyeSquintRight",
      ]
    );

  const cheekSquint =
    getBlendshapeScore(
      scoresByName,
      [
        "cheekSquintLeft",
        "cheekSquintRight",
      ]
    );

  const mouthPress =
    getBlendshapeScore(
      scoresByName,
      [
        "mouthPressLeft",
        "mouthPressRight",
      ]
    );

  const mouthLowerDown =
    getBlendshapeScore(
      scoresByName,
      [
        "mouthLowerDownLeft",
        "mouthLowerDownRight",
      ]
    );

  const mouthStretch =
    getBlendshapeScore(
      scoresByName,
      [
        "mouthStretchLeft",
        "mouthStretchRight",
      ]
    );

  const eyeLookDown =
    getBlendshapeScore(
      scoresByName,
      [
        "eyeLookDownLeft",
        "eyeLookDownRight",
      ]
    );

  const directTongueOut =
    getMaxBlendshapeScore(
      scoresByName,
      [
        "tongueOut",
        "tongue_out",
      ]
    );

  const tongueOutHeuristic =
    clamp01(
      jawOpen * 0.40 +
        mouthLowerDown * 0.35 +
        mouthStretch * 0.25
    );

  const tongueOut =
    Math.max(
      directTongueOut,
      tongueOutHeuristic
    );

  const upsetBrow =
    clamp01(
      browDown * 0.75 +
        eyeSquint * 0.15 +
        cheekSquint * 0.10
    );

  const upsetTension =
    clamp01(
      mouthPress * 0.35 +
        eyeSquint * 0.30 +
        cheekSquint * 0.20 +
        mouthStretch * 0.10 +
        mouthFrown * 0.05
    );

  const upset =
    clamp01(
      upsetBrow * 0.68 +
        upsetTension * 0.32
    );

  const mouthShrug =
    getBlendshapeScore(
      scoresByName,
      [
        "mouthShrugUpper",
        "mouthShrugLower",
      ]
    );

  const mouthPucker =
    getBlendshapeScore(
      scoresByName,
      [
        "mouthPucker",
      ]
    );

  const sadMouth =
    clamp01(
      mouthFrown * 0.44 +
        mouthPress * 0.18 +
        mouthShrug * 0.16 +
        mouthPucker * 0.12 +
        mouthLowerDown * 0.10
    );

  const sadEyes =
    clamp01(
      browInnerUp * 0.45 +
        eyeLookDown * 0.35 +
        eyeSquint * 0.20
    );

  const sad =
    clamp01(
      sadMouth * 0.70 +
        sadEyes * 0.30
    );

  return {
    smile,
    surprise,
    tongueOut,
    sad,
    sadMouth,
    sadEyes,
    upset,
    upsetBrow,
    upsetTension,
  };
}


export function useFacePresenceDetector({
  videoRef,
  isEnabled,
}: UseFacePresenceDetectorOptions):
  UseFacePresenceDetectorResult {
  const [
    status,
    setStatus,
  ] = useState<FacePresenceStatus>(
    "idle"
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    faceDetected,
    setFaceDetected,
  ] = useState(false);

  const [
    faceCount,
    setFaceCount,
  ] = useState(0);

  const [
    lastDetectedAt,
    setLastDetectedAt,
  ] = useState<number | null>(
    null
  );

  const [
    expressionSignal,
    setExpressionSignal,
  ] = useState<VisionExpressionSignal>(
    "no_face"
  );

  const [
    expressionConfidence,
    setExpressionConfidence,
  ] = useState(0);

  const [
    expressionScores,
    setExpressionScores,
  ] = useState<FaceExpressionScores>(
    EMPTY_EXPRESSION_SCORES
  );

  const animationFrameRef =
    useRef<number | null>(null);

  const lastVideoTimeRef =
    useRef(-1);

  const lastDetectionRunAtRef =
    useRef(0);

  const statusRef =
    useRef<FacePresenceStatus>(
      "idle"
    );

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    const clearLoop = (): void => {
      if (
        animationFrameRef.current !== null
      ) {
        window.cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current =
          null;
      }
    };

    if (!isEnabled) {
      clearLoop();
      setStatus("idle");
      setErrorMessage("");
      setFaceDetected(false);
      setFaceCount(0);
      setLastDetectedAt(null);
      setExpressionSignal("no_face");
      setExpressionConfidence(0);
      setExpressionScores(
        EMPTY_EXPRESSION_SCORES
      );
      lastVideoTimeRef.current = -1;
      lastDetectionRunAtRef.current = 0;
      return clearLoop;
    }

    const run = async (): Promise<void> => {
      setStatus("loading");
      setErrorMessage("");

      try {
        const detector =
          await loadFaceLandmarker();

        if (cancelled) {
          return;
        }

        setStatus("ready");

        const detectFrame = (): void => {
          if (cancelled) {
            return;
          }

          const video =
            videoRef.current;

          if (
            video &&
            video.readyState >=
              HTMLMediaElement.HAVE_CURRENT_DATA &&
            video.videoWidth > 0 &&
            video.videoHeight > 0
          ) {
            const now =
              performance.now();

            const currentVideoTime =
              video.currentTime;

            if (
              currentVideoTime !==
                lastVideoTimeRef.current &&
              now -
                lastDetectionRunAtRef.current >=
                125
            ) {
              lastVideoTimeRef.current =
                currentVideoTime;

              lastDetectionRunAtRef.current =
                now;

              const results =
                detector.detectForVideo(
                  video,
                  now
                );

              const nextFaceCount =
                results.faceLandmarks.length;

              setFaceCount(
                nextFaceCount
              );

              const nextFaceDetected =
                nextFaceCount > 0;

              setFaceDetected(
                nextFaceDetected
              );

              if (nextFaceDetected) {
                setLastDetectedAt(
                  Date.now()
                );

                const categories =
                  results.faceBlendshapes?.[0]
                    ?.categories ?? [];

                const nextScores =
                  extractExpressionScores(
                    categories
                  );

                const nextSignal =
                  classifyExpressionSignal(
                    nextScores
                  );

                setExpressionScores(
                  nextScores
                );

                setExpressionSignal(
                  nextSignal.signal
                );

                setExpressionConfidence(
                  nextSignal.confidence
                );

              } else {
                setExpressionScores(
                  EMPTY_EXPRESSION_SCORES
                );

                setExpressionSignal(
                  "no_face"
                );

                setExpressionConfidence(0);
              }

              if (
                statusRef.current !==
                "running"
              ) {
                setStatus("running");
              }
            }
          }

          animationFrameRef.current =
            window.requestAnimationFrame(
              detectFrame
            );
        };

        animationFrameRef.current =
          window.requestAnimationFrame(
            detectFrame
          );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not start face detection."
        );
        setFaceDetected(false);
        setFaceCount(0);
        setExpressionSignal("no_face");
        setExpressionConfidence(0);
        setExpressionScores(
          EMPTY_EXPRESSION_SCORES
        );
      }
    };

    void run();

    return () => {
      cancelled = true;
      clearLoop();
    };
  }, [
    isEnabled,
    videoRef,
  ]);

  return {
    status,
    errorMessage,
    isModelReady:
      status === "ready" ||
      status === "running",
    isDetecting:
      status === "running",
    faceDetected,
    faceCount,
    lastDetectedAt,
    expressionSignal,
    expressionConfidence,
    expressionScores,
  };
}
