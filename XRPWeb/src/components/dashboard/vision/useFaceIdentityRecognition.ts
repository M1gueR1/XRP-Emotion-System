import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  RefObject,
} from "react";

export type FaceIdentityRecognitionStatus =
  | "idle"
  | "loading"
  | "ready"
  | "running"
  | "error";

export type UseFaceIdentityRecognitionOptions = {
  videoRef: RefObject<HTMLVideoElement>;
  isEnabled: boolean;
};

export type UseFaceIdentityRecognitionResult = {
  status: FaceIdentityRecognitionStatus;
  errorMessage: string;
  descriptor: number[] | null;
  detectionConfidence: number;
};

const FACE_API_MODEL_URL =
  `${import.meta.env.BASE_URL}models/face-api`;

const DETECTION_INTERVAL_MS = 350;

type FaceApiModule =
  typeof import("@vladmandic/face-api");

let modelPromise:
  Promise<FaceApiModule> | null =
  null;

async function loadRecognitionModels():
  Promise<FaceApiModule> {
  if (!modelPromise) {
    modelPromise =
      import("@vladmandic/face-api")
      .then(async (faceApi) => {
        await Promise.all([
          //identifica donde esta la cara en la camara/video xd
          faceApi.nets.tinyFaceDetector.loadFromUri(
            FACE_API_MODEL_URL
          ),
          //una vez se identifica donde esta la cara, le pone 68 marcas al rostro para tenerlos de referencia
          faceApi.nets.faceLandmark68TinyNet.loadFromUri(
            FACE_API_MODEL_URL
          ),
          //convierte la cara en un vector de 128 dimensiones para poder comparar con otras caras
          faceApi.nets.faceRecognitionNet.loadFromUri(
            FACE_API_MODEL_URL
          ),
        ]);

        return faceApi;
      })
      .catch((error) => {
        modelPromise = null;
        throw error;
      });
  }

  return modelPromise;
}

export function useFaceIdentityRecognition({
  videoRef,
  isEnabled,
}: UseFaceIdentityRecognitionOptions):
  UseFaceIdentityRecognitionResult {
  const [
    status,
    setStatus,
  ] = useState<FaceIdentityRecognitionStatus>(
    "idle"
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    descriptor,
    setDescriptor,
  ] = useState<number[] | null>(null);

  const [
    detectionConfidence,
    setDetectionConfidence,
  ] = useState(0);

  const timerRef =
    useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const clearTimer = (): void => {
      if (timerRef.current !== null) {
        window.clearTimeout(
          timerRef.current
        );
        timerRef.current = null;
      }
    };

    if (!isEnabled) {
      clearTimer();
      setStatus("idle");
      setErrorMessage("");
      setDescriptor(null);
      setDetectionConfidence(0);
      return clearTimer;
    }

    const run = async (): Promise<void> => {
      setStatus("loading");
      setErrorMessage("");

      try {
        const faceApi =
          await loadRecognitionModels();

        if (cancelled) {
          return;
        }

        setStatus("ready");

        const detect = async (): Promise<void> => {
          if (cancelled) {
            return;
          }

          const video = videoRef.current;

          if (
            video &&
            video.readyState >=
              HTMLMediaElement.HAVE_CURRENT_DATA &&
            video.videoWidth > 0 &&
            video.videoHeight > 0
          ) {
            try {
//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA 
              const result =  await faceApi.detectSingleFace(
                    video,
                    new faceApi.TinyFaceDetectorOptions({
                      inputSize: 224,
                      scoreThreshold: 0.5,
                    })
                  )
                  .withFaceLandmarks(true)
                  .withFaceDescriptor();

              if (cancelled) {
                return;
              }

              if (result) {
                setDescriptor(
                  Array.from(
                    result.descriptor
                  )
                );
                setDetectionConfidence(
                  result.detection.score
                );
              } else {
                setDescriptor(null);
                setDetectionConfidence(0);
              }

              setStatus("running");
            } catch (error) {
              if (!cancelled) {
                setDescriptor(null);
                setDetectionConfidence(0);
                setStatus("error");
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Face recognition failed."
                );
              }
            }
          }

          if (!cancelled) {
            timerRef.current =
              window.setTimeout(
                () => {
                  void detect();
                },
                DETECTION_INTERVAL_MS
              );
          }
        };

        void detect();
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setDescriptor(null);
        setDetectionConfidence(0);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load the local face recognition models."
        );
      }
    };

    void run();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [
    isEnabled,
    videoRef,
  ]);

  return {
    status,
    errorMessage,
    descriptor,
    detectionConfidence,
  };
}
