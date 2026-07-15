import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";


export type CameraStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "error";


export type UseCameraStreamResult = {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  status: CameraStatus;
  errorMessage: string;
  isCameraSupported: boolean;
  isCameraActive: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
};

//hoook para mostrar la camaraaaa
export function useCameraStream():
  UseCameraStreamResult {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const [
    stream,
    setStream,
  ] = useState<MediaStream | null>(
    null
  );

  const [
    status,
    setStatus,
  ] = useState<CameraStatus>(
    "idle"
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  //guardo si es compatible o no lacamara
  const isCameraSupported =
    typeof navigator !== "undefined" &&
    Boolean(
      navigator.mediaDevices?.getUserMedia
    );

  const stopCamera =
    useCallback(() => {
      const currentStream =
        streamRef.current;

      if (currentStream) {
        currentStream
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }

      streamRef.current = null;
      setStream(null);
      setStatus("idle");

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject =
          null;
      }
    }, []);

  const startCamera =
    useCallback(async () => {
      if (!isCameraSupported) {
        setStatus("error");
        setErrorMessage(
          "Camera access is not supported in this browser."
        );
        return;
      }

      setStatus("requesting");
      setErrorMessage("");

      try {
        stopCamera();

        const nextStream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: {
                ideal: 640,
              },
              height: {
                ideal: 480,
              },
            },
            audio: false,
          });

        streamRef.current =
          nextStream;

        setStream(
          nextStream
        );

        setStatus("ready");
      } catch (error) {
        setStatus("error");

        if (
          error instanceof DOMException &&
          error.name === "NotAllowedError"
        ) {
          setErrorMessage(
            "Camera permission was denied. Allow camera access and try again."
          );
        } else if (
          error instanceof DOMException &&
          error.name === "NotFoundError"
        ) {
          setErrorMessage(
            "No camera was found on this device."
          );
        } else {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not open the camera."
          );
        }

        stopCamera();
      }
    }, [
      isCameraSupported,
      stopCamera,
    ]);

  useEffect(() => {
    const videoElement =
      videoRef.current;

    if (!videoElement) {
      return;
    }

    if (videoElement.srcObject !== stream) {
      videoElement.srcObject =
        stream;
    }

    if (stream) {
      void videoElement
        .play()
        .catch(() => {
          /*
           * Autoplay may fail in some browsers. This is not
           * fatal because the user already interacted with
           * the camera button.
           */
        });
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    stream,
    status,
    errorMessage,
    isCameraSupported,
    isCameraActive:
      status === "ready" &&
      Boolean(stream),
    startCamera,
    stopCamera,
  };
}
