import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FaCamera,
  FaTrash,
} from "react-icons/fa";

import SensorCard from "./SensorCard";

import Dialog from "../../dialogs/dialog";

import {
  useGridStackWidget,
} from "../hooks/useGridStackWidget";

import {
  useCameraStream,
} from "../vision/useCameraStream";

import {
  useFacePresenceDetector,
} from "../vision/useFacePresenceDetector";

import {
  useFaceIdentityRecognition,
} from "../vision/useFaceIdentityRecognition";

import {
  FACE_IDENTITY_MIN_SAMPLES,
  FACE_IDENTITY_PROFILES_CHANGED_EVENT,
  FACE_RECOGNITION_ENABLED_STORAGE_KEY,
  deleteFaceIdentityProfile,
  findMatchingFaceIdentity,
  getFaceIdentityProfiles,
  normalizeFaceIdentityDisplayName,
  saveFaceIdentityProfile,
  type FaceIdentityProfile,
} from "../vision/faceIdentityStore";

import {
  checkChildSafety,
} from "../safety/childSafetyEngine";

import {
  getChildSafetyPolicy,
  verifyTeacherPasscode,
} from "../safety/childSafetyPolicyStore";

import {
  USER_PROFILE_CHANGED_EVENT,
  getUserProfiles,
  type UserProfile,
} from "../profiles/userProfileStore";


const CAMERA_HAPPY_EMOTION_ID = 1;
const CAMERA_EXCITED_EMOTION_ID = 3;
const CAMERA_SAD_EMOTION_ID = 9;
const CAMERA_IDLE_EMOTION_ID = 0;
const CAMERA_UPSET_EMOTION_ID = 8;
const FACE_RECOGNITION_EVENT =
  "xrp:camera-person-recognized";
const ROBOT_CHAT_READY_EVENT =
  "xrp:robot-chat-ready";
const FACE_RECOGNITION_CONFIRMATION_FRAMES = 2;
const FACE_RECOGNITION_CONFIRMATION_WINDOW_MS =
  1_500;
const FACE_RECOGNITION_EVENT_COOLDOWN_MS =
  30_000;


type CameraDecision = {
  signal: string;
  emotionId: number;
  emotionLabel: string;
  confidence: number;
  reason: string;
};

type RecognizedPersonEventDetail = {
  profileId: string;
  displayName: string;
  confidence: number;
  source: "camera_face_recognition";
  cameraSessionId: string;
};

const FACE_SETUP_STEPS = [
  {
    title: "Look straight ahead",
    hint: "Keep your face inside the oval.",
    arrow: "↑",
  },
  {
    title: "Turn a little to one side",
    hint: "Move your head gently, like a tiny profile view.",
    arrow: "↗",
  },
  {
    title: "Now turn the other way",
    hint: "One more gentle turn so the robot learns you better.",
    arrow: "↖",
  },
];


const faceDetectionStatusLabel = (
  status: string,
  faceDetected: boolean
): string => {
  if (status === "loading") {
    return "Loading face model";
  }

  if (status === "error") {
    return "Face detection error";
  }

  if (status === "idle") {
    return "Face detection idle";
  }

  return faceDetected
    ? "Face detected"
    : "No face detected";
};


const faceDetectionStatusClass = (
  status: string,
  faceDetected: boolean
): string => {
  if (status === "loading") {
    return "bg-amber-600";
  }

  if (status === "error") {
    return "bg-red-600";
  }

  if (status === "idle") {
    return "bg-slate-600";
  }

  return faceDetected
    ? "bg-emerald-600"
    : "bg-zinc-700";
};


const expressionSignalLabel = (
  signal: string
): string => {
  switch (signal) {
    case "happy":
      return "Happy signal";

    case "surprised":
      return "Surprised signal";

    case "tongue_out":
      return "Tongue out signal";

    case "sad":
      return "Sad signal";

    case "upset":
      return "Upset signal";

    case "neutral":
      return "Neutral signal";

    default:
      return "No face signal";
  }
};


const expressionSignalClass = (
  signal: string
): string => {
  switch (signal) {
    case "happy":
      return "bg-emerald-600";

    case "surprised":
      return "bg-indigo-600";

    case "tongue_out":
      return "bg-fuchsia-600";

    case "sad":
      return "bg-blue-800";

    case "upset":
      return "bg-orange-700";

    case "neutral":
      return "bg-zinc-700";

    default:
      return "bg-slate-600";
  }
};


const percentageLabel = (
  value: number
): string =>
  `${Math.round(
    Math.min(
      Math.max(
        value,
        0
      ),
      1
    ) * 100
  )}%`;


const cameraSignalEmotionId = (
  signal: string
): number | null => {
  switch (signal) {
    case "happy":
      return CAMERA_HAPPY_EMOTION_ID;

    case "surprised":
    case "tongue_out":
      return CAMERA_EXCITED_EMOTION_ID;

    case "sad":
      return CAMERA_SAD_EMOTION_ID;

    case "upset":
      return CAMERA_UPSET_EMOTION_ID;

    case "neutral":
      return CAMERA_IDLE_EMOTION_ID;

    default:
      return null;
  }
};


const cameraSignalEmotionLabel = (
  signal: string
): string => {
  switch (signal) {
    case "happy":
      return "Happy";

    case "surprised":
    case "tongue_out":
      return "Excited";

    case "sad":
      return "Sad";

    case "upset":
      return "Upset";

    case "neutral":
      return "Idle / neutral";

    default:
      return "No change";
  }
};


const cameraSignalWhyText = (
  signal: string
): string => {
  switch (signal) {
    case "happy":
      return "The camera detected a smile-like visual cue, so the robot mirrors a happy expression.";

    case "surprised":
      return "The camera detected wide-eye or surprise-like visual cues, so the robot reacts with excitement.";

    case "tongue_out":
      return "The camera detected a playful mouth gesture, so the robot reacts as excited.";

    case "sad":
      return "The camera detected sadness-like mouth and eye cues, so the robot previews a sad expression.";

    case "upset":
      return "The camera detected eyebrow or tension cues that look frustrated, so the robot previews upset.";

    case "neutral":
      return "The camera detected a face without a strong expression, so the robot stays calm and attentive.";

    default:
      return "No strong visual signal was detected, so the robot does not change.";
  }
};


function emitDashboardEmotionPreview(
  decision: CameraDecision
): void {
  window.dispatchEvent(
    new CustomEvent(
      "xrp:dashboard-emotion-preview",
      {
        detail: {
          source: "camera_vision",
          emotionId:
            decision.emotionId,
          emotionLabel:
            decision.emotionLabel,
          signal:
            decision.signal,
          confidence:
            decision.confidence,
          reason:
            decision.reason,
        },
      }
    )
  );
}


const CameraVisionWidget: React.FC = () => {
  const { handleDelete } =
    useGridStackWidget();

  const [
    showVisionOptions,
    setShowVisionOptions,
  ] = useState(false);

  const [
    showKnownPeople,
    setShowKnownPeople,
  ] = useState(false);

  const [
    faceSetupFlash,
    setFaceSetupFlash,
  ] = useState(false);

  const [
    cameraEmotionControlEnabled,
    setCameraEmotionControlEnabled,
  ] = useState(false);

  const [
    lastCameraDecision,
    setLastCameraDecision,
  ] = useState<CameraDecision | null>(
    null
  );

  const [
    faceRecognitionEnabled,
    setFaceRecognitionEnabled,
  ] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(
        FACE_RECOGNITION_ENABLED_STORAGE_KEY
      ) === "true"
  );

  const [
    faceIdentityProfiles,
    setFaceIdentityProfiles,
  ] = useState<FaceIdentityProfile[]>(
    () => getFaceIdentityProfiles()
  );

  const [
    selectedUserProfileId,
    setSelectedUserProfileId,
  ] = useState("");

  const [
    availableUserProfiles,
    setAvailableUserProfiles,
  ] = useState<UserProfile[]>(
    () => getUserProfiles()
  );

  const [
    faceIdentityStatus,
    setFaceIdentityStatus,
  ] = useState(
    "Face recognition is off."
  );

  const [
    faceTeacherUnlocked,
    setFaceTeacherUnlocked,
  ] = useState(false);

  const [
    faceTeacherPasscode,
    setFaceTeacherPasscode,
  ] = useState("");

  const [
    pendingDeleteFaceProfileId,
    setPendingDeleteFaceProfileId,
  ] = useState("");

  const [
    deleteFacePasscode,
    setDeleteFacePasscode,
  ] = useState("");

  const [
    lastRecognizedName,
    setLastRecognizedName,
  ] = useState("");

  const [
    recognitionGreeting,
    setRecognitionGreeting,
  ] = useState("");

  const lastCameraEmotionSignalRef =
    useRef<string | null>(null);

  const lastCameraEmotionChangedAtRef =
    useRef(0);

  const recognitionCandidateRef =
    useRef<{
      profileId: string;
      count: number;
      lastSeenAt: number;
    } | null>(null);

  const recognitionEmittedAtRef =
    useRef<Map<string, number>>(
      new Map()
    );

  const currentRecognizedPersonRef =
    useRef<RecognizedPersonEventDetail | null>(
      null
    );

  const faceSetupVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const cameraSessionIdRef =
    useRef("");

  const cameraSessionSequenceRef =
    useRef(0);

  const {
    videoRef: cameraVideoRef,
    status: cameraStatus,
    errorMessage: cameraErrorMessage,
    isCameraSupported,
    isCameraActive,
    startCamera,
    stopCamera,
  } = useCameraStream();

  const {
    status: faceDetectionStatus,
    errorMessage: faceDetectionErrorMessage,
    faceDetected,
    faceCount,
    expressionSignal,
    expressionConfidence,
    expressionScores,
  } = useFacePresenceDetector({
    videoRef: cameraVideoRef,
    isEnabled: isCameraActive,
  });

  const {
    status:
      faceIdentityRecognitionStatus,
    errorMessage:
      faceIdentityRecognitionError,
    descriptor:
      faceIdentityDescriptor,
    detectionConfidence:
      faceIdentityDetectionConfidence,
  } = useFaceIdentityRecognition({
    videoRef: cameraVideoRef,
    isEnabled:
      isCameraActive &&
      (
        faceRecognitionEnabled ||
        faceTeacherUnlocked
      ),
  });

  useEffect(() => {
    const setupVideo =
      faceSetupVideoRef.current;
    const sourceVideo =
      cameraVideoRef.current;

    if (!setupVideo || !sourceVideo) {
      return;
    }

    setupVideo.srcObject =
      sourceVideo.srcObject;

    if (showVisionOptions && isCameraActive) {
      void setupVideo.play().catch(() => {});
    }
  }, [
    isCameraActive,
    showVisionOptions,
  ]);

  useEffect(() => {
    const refreshProfiles = (): void => {
      setFaceIdentityProfiles(
        getFaceIdentityProfiles()
      );
    };

    window.addEventListener(
      FACE_IDENTITY_PROFILES_CHANGED_EVENT,
      refreshProfiles
    );

    window.addEventListener(
      "storage",
      refreshProfiles
    );

    return () => {
      window.removeEventListener(
        FACE_IDENTITY_PROFILES_CHANGED_EVENT,
        refreshProfiles
      );

      window.removeEventListener(
        "storage",
        refreshProfiles
      );
    };
  }, []);

  useEffect(() => {
    const refreshUserProfiles =
      (): void => {
        const nextProfiles =
          getUserProfiles();

        setAvailableUserProfiles(
          nextProfiles
        );

        setSelectedUserProfileId(
          (current) =>
            nextProfiles.some(
              (profile) =>
                profile.id === current
            )
              ? current
              : ""
        );
      };

    window.addEventListener(
      USER_PROFILE_CHANGED_EVENT,
      refreshUserProfiles
    );

    window.addEventListener(
      "storage",
      refreshUserProfiles
    );

    return () => {
      window.removeEventListener(
        USER_PROFILE_CHANGED_EVENT,
        refreshUserProfiles
      );

      window.removeEventListener(
        "storage",
        refreshUserProfiles
      );
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      FACE_RECOGNITION_ENABLED_STORAGE_KEY,
      String(faceRecognitionEnabled)
    );

    if (!faceRecognitionEnabled) {
      recognitionCandidateRef.current =
        null;
      currentRecognizedPersonRef.current =
        null;
      setLastRecognizedName("");
      setRecognitionGreeting("");
      setFaceIdentityStatus(
        "Face recognition is off."
      );
    } else {
      setFaceIdentityStatus(
        "Looking for enrolled people locally."
      );
    }
  }, [faceRecognitionEnabled]);

  useEffect(() => {
    if (isCameraActive) {
      if (!cameraSessionIdRef.current) {
        cameraSessionSequenceRef.current +=
          1;

        cameraSessionIdRef.current =
          `camera-session-${Date.now()}-${cameraSessionSequenceRef.current}`;
      }

      return;
    }

    /*
     * A new camera session should be allowed to greet immediately,
     * even if the same person was recognized moments before.
     */
    recognitionCandidateRef.current =
      null;
    currentRecognizedPersonRef.current =
      null;
    recognitionEmittedAtRef.current.clear();
    cameraSessionIdRef.current = "";
    setLastRecognizedName("");
    setRecognitionGreeting("");

    if (faceRecognitionEnabled) {
      setFaceIdentityStatus(
        "Camera is off. Recognition will resume when it is turned on."
      );
    }
  }, [
    faceRecognitionEnabled,
    isCameraActive,
  ]);

  useEffect(() => {
    if (
      !faceRecognitionEnabled ||
      !isCameraActive ||
      faceCount !== 1 ||
      !faceIdentityDescriptor ||
      faceIdentityDetectionConfidence <
        0.5
    ) {
      const candidate =
        recognitionCandidateRef.current;

      if (
        !candidate ||
        Date.now() -
          candidate.lastSeenAt >
          FACE_RECOGNITION_CONFIRMATION_WINDOW_MS
      ) {
        recognitionCandidateRef.current =
          null;
        currentRecognizedPersonRef.current =
          null;
      }
      return;
    }

    const match =
      findMatchingFaceIdentity(
        faceIdentityDescriptor,
        faceIdentityProfiles
      );

    if (!match) {
      const candidate =
        recognitionCandidateRef.current;

      if (
        !candidate ||
        Date.now() -
          candidate.lastSeenAt >
          FACE_RECOGNITION_CONFIRMATION_WINDOW_MS
      ) {
        recognitionCandidateRef.current =
          null;
        currentRecognizedPersonRef.current =
          null;
      }
      setFaceIdentityStatus(
        "Face seen, but no confident known-person match."
      );
      return;
    }

    const previous =
      recognitionCandidateRef.current;

    const now = Date.now();

    const nextCount =
      previous?.profileId ===
        match.profile.id &&
      now - previous.lastSeenAt <=
        FACE_RECOGNITION_CONFIRMATION_WINDOW_MS
        ? previous.count + 1
        : 1;

    recognitionCandidateRef.current = {
      profileId: match.profile.id,
      count: nextCount,
      lastSeenAt: now,
    };

    if (
      nextCount <
      FACE_RECOGNITION_CONFIRMATION_FRAMES
    ) {
      setFaceIdentityStatus(
        `Confirming ${match.profile.displayName}...`
      );
      return;
    }

    const lastEmittedAt =
      recognitionEmittedAtRef.current.get(
        match.profile.id
      ) ?? 0;

    setLastRecognizedName(
      match.profile.displayName
    );
    setRecognitionGreeting(
      `Hello, ${match.profile.displayName}! It's great to have you back.`
    );
    setFaceIdentityStatus(
      `Last recognized: ${match.profile.displayName}`
    );

    if (
      now - lastEmittedAt <
      FACE_RECOGNITION_EVENT_COOLDOWN_MS
    ) {
      return;
    }

    recognitionEmittedAtRef.current.set(
      match.profile.id,
      now
    );

    const detail:
      RecognizedPersonEventDetail = {
        profileId: match.profile.id,
        displayName:
          match.profile.displayName,
        confidence:
          match.confidence,
        source:
          "camera_face_recognition",
        cameraSessionId:
          cameraSessionIdRef.current,
      };

    currentRecognizedPersonRef.current =
      detail;

    window.dispatchEvent(
      new CustomEvent(
        FACE_RECOGNITION_EVENT,
        { detail }
      )
    );
  }, [
    faceCount,
    faceIdentityDescriptor,
    faceIdentityDetectionConfidence,
    faceIdentityProfiles,
    faceRecognitionEnabled,
    isCameraActive,
  ]);

  useEffect(() => {
    const handleRobotChatReady =
      (): void => {
        const detail =
          currentRecognizedPersonRef.current;

        if (
          !faceRecognitionEnabled ||
          !detail
        ) {
          return;
        }

        recognitionEmittedAtRef.current.set(
          detail.profileId,
          Date.now()
        );

        window.dispatchEvent(
          new CustomEvent(
            FACE_RECOGNITION_EVENT,
            { detail }
          )
        );
      };

    window.addEventListener(
      ROBOT_CHAT_READY_EVENT,
      handleRobotChatReady
    );

    return () => {
      window.removeEventListener(
        ROBOT_CHAT_READY_EVENT,
        handleRobotChatReady
      );
    };
  }, [faceRecognitionEnabled]);

  const handleUnlockFaceTeacherMode =
    (): void => {
      if (
        verifyTeacherPasscode(
          faceTeacherPasscode,
          getChildSafetyPolicy()
        )
      ) {
        setFaceTeacherUnlocked(true);
        setFaceTeacherPasscode("");
        setFaceIdentityStatus(
          "Teacher controls unlocked for this camera session."
        );
        return;
      }

      setFaceIdentityStatus(
        "Incorrect teacher passcode."
      );
    };

  const handleCaptureFaceSample =
    (): void => {
      const selectedProfile =
        availableUserProfiles.find(
          (profile) =>
            profile.id ===
            selectedUserProfileId
        );

      const displayName =
        normalizeFaceIdentityDisplayName(
          selectedProfile?.displayName ??
            ""
        );

      if (
        !selectedProfile ||
        !displayName
      ) {
        setFaceIdentityStatus(
          "Choose an existing Robot Chat profile."
        );
        return;
      }

      const nameSafety =
        checkChildSafety(
          displayName,
          getChildSafetyPolicy()
        );

      if (!nameSafety.allowed) {
        setFaceIdentityStatus(
          "That display name is not allowed by classroom safety rules."
        );
        return;
      }

      if (
        !isCameraActive ||
        faceCount !== 1 ||
        !faceIdentityDescriptor ||
        faceIdentityRecognitionStatus ===
          "loading"
      ) {
        setFaceIdentityStatus(
          "Show exactly one face clearly to capture a sample."
        );
        return;
      }

      try {
        const profile =
          saveFaceIdentityProfile(
            selectedProfile.id,
            displayName,
            faceIdentityDescriptor
          );

        const sampleCount =
          profile.descriptors.length;

        setFaceSetupFlash(true);
        window.setTimeout(
          () => setFaceSetupFlash(false),
          620
        );

        setFaceIdentityStatus(
          sampleCount <
            FACE_IDENTITY_MIN_SAMPLES
            ? `Sample ${sampleCount}/${FACE_IDENTITY_MIN_SAMPLES} saved for ${profile.displayName}. Move slightly and capture again.`
            : `${profile.displayName} is enrolled with ${sampleCount} local landmark samples.`
        );

        setFaceIdentityProfiles(
          getFaceIdentityProfiles()
        );

        if (
          sampleCount >=
          FACE_IDENTITY_MIN_SAMPLES
        ) {
          window.setTimeout(() => {
            setShowVisionOptions(false);
          }, 1300);
        }
      } catch (error) {
        setFaceIdentityStatus(
          error instanceof Error
            ? error.message
            : "Could not save the face sample."
        );
      }
    };

  const handleConfirmDeleteFaceProfile =
    (profile: FaceIdentityProfile): void => {
      if (
        !verifyTeacherPasscode(
          deleteFacePasscode,
          getChildSafetyPolicy()
        )
      ) {
        setFaceIdentityStatus(
          "Incorrect teacher passcode."
        );
        return;
      }

      deleteFaceIdentityProfile(
        profile.id
      );
      setFaceIdentityProfiles(
        getFaceIdentityProfiles()
      );
      setPendingDeleteFaceProfileId("");
      setDeleteFacePasscode("");
      setFaceIdentityStatus(
        `${profile.displayName} was deleted.`
      );
    };

  const handleOpenFaceSetup =
    (): void => {
      setShowVisionOptions(true);
      setFaceRecognitionEnabled(true);

      if (
        !isCameraActive &&
        isCameraSupported &&
        cameraStatus !== "requesting"
      ) {
        void startCamera();
      }
    };

  useEffect(() => {
    if (
      !cameraEmotionControlEnabled ||
      !isCameraActive ||
      !faceDetected
    ) {
      lastCameraEmotionSignalRef.current =
        null;

      if (
        !cameraEmotionControlEnabled ||
        !isCameraActive
      ) {
        setLastCameraDecision(null);
      }

      return;
    }

    const mappedEmotionId =
      cameraSignalEmotionId(
        expressionSignal
      );

    if (mappedEmotionId === null) {
      return;
    }

    const strongEnough =
      expressionSignal === "neutral"
        ? expressionConfidence >= 0.55
        : expressionSignal === "sad"
          ? expressionConfidence >= 0.11
          : expressionSignal === "upset"
            ? expressionConfidence >= 0.12
            : expressionConfidence >= 0.20;

    if (!strongEnough) {
      return;
    }

    const previousSignal =
      lastCameraEmotionSignalRef.current;

    lastCameraEmotionSignalRef.current =
      expressionSignal;

    const shouldRequireRepeatedSignal =
      expressionSignal !== "sad" &&
      expressionSignal !== "upset";

    if (
      shouldRequireRepeatedSignal &&
      previousSignal !== expressionSignal
    ) {
      return;
    }

    const decision: CameraDecision = {
      signal:
        expressionSignal,
      emotionId:
        mappedEmotionId,
      emotionLabel:
        cameraSignalEmotionLabel(
          expressionSignal
        ),
      confidence:
        expressionConfidence,
      reason:
        cameraSignalWhyText(
          expressionSignal
        ),
    };

    setLastCameraDecision(
      decision
    );

    const now = Date.now();

    if (
      now -
        lastCameraEmotionChangedAtRef.current <
      1000
    ) {
      return;
    }

    lastCameraEmotionChangedAtRef.current =
      now;

    emitDashboardEmotionPreview(
      decision
    );
  }, [
    cameraEmotionControlEnabled,
    expressionConfidence,
    expressionSignal,
    faceDetected,
    isCameraActive,
  ]);

  const canCaptureFaceSample =
    Boolean(selectedUserProfileId) &&
    isCameraActive &&
    faceCount === 1 &&
    Boolean(faceIdentityDescriptor) &&
    faceIdentityRecognitionStatus !==
      "loading";

  const noFaceReadyForSample =
    isCameraActive &&
    Boolean(selectedUserProfileId) &&
    (
      faceCount !== 1 ||
      !faceIdentityDescriptor
    ) &&
    faceIdentityRecognitionStatus !==
      "loading";

  const selectedUserProfile =
    availableUserProfiles.find(
      (profile) =>
        profile.id === selectedUserProfileId
    );

  const selectedFaceIdentityProfile =
    faceIdentityProfiles.find(
      (profile) =>
        profile.userProfileId ===
        selectedUserProfileId
    );

  const faceSetupSampleCount =
    Math.min(
      selectedFaceIdentityProfile
        ?.descriptors.length ?? 0,
      FACE_IDENTITY_MIN_SAMPLES
    );

  const faceSetupIsComplete =
    faceSetupSampleCount >=
    FACE_IDENTITY_MIN_SAMPLES;

  const faceSetupStep =
    FACE_SETUP_STEPS[
      Math.min(
        faceSetupSampleCount,
        FACE_SETUP_STEPS.length - 1
      )
    ];

  const faceSetupProgressPercent =
    Math.round(
      (
        faceSetupSampleCount /
        FACE_IDENTITY_MIN_SAMPLES
      ) * 100
    );

  return (
    <>
      <Dialog
        isOpen={showVisionOptions}
        toggleDialog={() =>
          setShowVisionOptions(false)
        }
      >
        <div className="flex max-h-[88vh] w-[min(94vw,920px)] flex-col gap-4 overflow-hidden bg-black p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                Recognize face
              </h2>

              <p className="mt-1 text-xs text-zinc-300">
                Follow 3 quick steps so the robot can recognize you.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowVisionOptions(false)
              }
              className="rounded border border-white bg-black px-3 py-1 text-xs font-bold text-white transition hover:bg-white hover:text-black"
            >
              Close
            </button>
          </div>

          <div className="min-h-0 overflow-auto pr-1">
            <div className="grid gap-3">
              <select
                value={selectedUserProfileId}
                onChange={(event) => {
                  setSelectedUserProfileId(
                    event.target.value
                  );
                }}
                className="w-full rounded-lg border border-sky-300 bg-sky-950/40 px-3 py-2 text-xs font-bold text-white placeholder:text-zinc-500"
              >
                <option value="">
                  Choose existing chat profile
                </option>

                {availableUserProfiles.map(
                  (profile) => (
                    <option
                      key={profile.id}
                      value={profile.id}
                    >
                      {profile.displayName}
                    </option>
                  )
                )}
              </select>

              {faceSetupIsComplete ? (
                <div className="rounded-2xl border border-emerald-400 bg-emerald-950/50 px-4 py-10 text-center">
                  <div className="text-4xl">
                    ✓
                  </div>

                  <div className="mt-3 text-xl font-black">
                    Face registration completed successfully.
                  </div>

                  <div className="mt-2 text-xs text-emerald-100">
                    Returning to the dashboard...
                  </div>
                </div>
              ) : (
              <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="relative overflow-hidden rounded-2xl border border-white bg-zinc-950">
                  {isCameraActive ? (
                    <video
                      ref={faceSetupVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className={[
                        "aspect-video h-full w-full scale-x-[-1] bg-black object-cover transition-all duration-500 ease-out",
                        faceSetupFlash
                          ? "opacity-75 blur-[1px]"
                          : "opacity-100 blur-0",
                      ].join(" ")}
                    />
                  ) : (
                    <div className="flex aspect-video h-full w-full items-center justify-center px-4 text-center text-xs font-semibold text-white">
                      The camera will appear here after you allow camera permission.
                    </div>
                  )}

                  <div
                    className={[
                      "pointer-events-none absolute inset-0 z-10 bg-white transition-opacity duration-500 ease-out",
                      faceSetupFlash
                        ? "opacity-55"
                        : "opacity-0",
                    ].join(" ")}
                  />

                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <div className="relative h-[72%] w-[46%] rounded-[50%] border-4 border-blue-300/90 shadow-[0_0_32px_rgba(96,165,250,0.55)]">
                      {!faceSetupIsComplete && (
                        <div className="absolute -right-16 top-1/2 -translate-y-1/2 rounded-full border border-blue-200 bg-blue-600/90 px-4 py-2 text-4xl font-black text-white shadow-xl">
                          {faceSetupStep.arrow}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="absolute left-3 top-3 z-30 rounded-full bg-black/80 px-3 py-1 text-xs font-bold text-white">
                    Step{" "}
                    {Math.min(
                      faceSetupSampleCount + 1,
                      FACE_IDENTITY_MIN_SAMPLES
                    )}
                    /{FACE_IDENTITY_MIN_SAMPLES}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-white bg-black p-4">
                  <div className="space-y-3">
                    <div className="rounded-full border border-blue-300/70 bg-zinc-800 p-1">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 transition-all duration-700 ease-out"
                        style={{
                          width: `${faceSetupProgressPercent}%`,
                        }}
                      />
                    </div>

                    {faceSetupIsComplete ? (
                      <div className="rounded-2xl border border-emerald-400 bg-emerald-950 px-4 py-5 text-center">
                        <div className="text-4xl">
                          ✓
                        </div>

                        <div className="mt-2 text-lg font-black">
                          Face saved successfully!
                        </div>

                        <div className="mt-1 text-xs text-emerald-100">
                          The robot can now recognize{" "}
                          {selectedFaceIdentityProfile
                            ?.displayName ??
                            selectedUserProfile
                              ?.displayName ??
                            "this profile"}
                          .
                        </div>
                      </div>
                    ) : (
                      <div
                        className={[
                          "rounded-2xl border border-blue-400 bg-blue-950 px-4 py-5 text-center transition-all duration-500 ease-out",
                          faceSetupFlash
                            ? "translate-x-2 opacity-70"
                            : "translate-x-0 opacity-100",
                        ].join(" ")}
                      >
                        <div className="text-5xl font-black">
                          {faceSetupStep.arrow}
                        </div>

                        <div className="mt-2 text-lg font-black">
                          {faceSetupStep.title}
                        </div>

                        <div className="mt-1 text-xs text-blue-100">
                          {faceSetupStep.hint}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-center text-[11px]">
                      {faceIdentityStatus}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !canCaptureFaceSample ||
                      faceSetupIsComplete
                    }
                    onClick={
                      handleCaptureFaceSample
                    }
                    className={[
                      "mt-4 flex items-center justify-center gap-3 rounded-xl border border-white px-4 py-3 text-sm font-black text-white transition",
                      faceSetupIsComplete
                        ? "cursor-not-allowed bg-emerald-700 opacity-80"
                        : canCaptureFaceSample
                          ? "bg-blue-600 hover:bg-blue-700"
                          : noFaceReadyForSample
                            ? "cursor-not-allowed bg-red-700"
                            : "cursor-not-allowed bg-zinc-800 opacity-60",
                    ].join(" ")}
                  >
                    <span>
                      {faceSetupIsComplete
                        ? "All samples saved"
                        : noFaceReadyForSample
                          ? "No face detected"
                          : "Capture face sample"}
                    </span>
                    {!faceSetupIsComplete && (
                      <span className="text-xl">
                        →
                      </span>
                    )}
                  </button>
                </div>
              </div>
              )}

              {false && (
                <>
              <div className="rounded-xl border border-white bg-black p-3 text-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-bold">
                    Face recognition
                  </div>

                  <button
                    type="button"
                    disabled={!isCameraActive}
                    onClick={() => {
                      setFaceRecognitionEnabled(
                        (current) => !current
                      );
                    }}
                    className={[
                      "shrink-0 rounded-lg border border-white px-3 py-1.5 text-xs font-bold text-white transition",
                      faceRecognitionEnabled
                        ? "bg-emerald-700"
                        : "bg-zinc-800",
                      !isCameraActive
                        ? "cursor-not-allowed opacity-50"
                        : "",
                    ].join(" ")}
                  >
                    {faceRecognitionEnabled
                      ? "On"
                      : "Off"}
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={selectedUserProfileId}
                      onChange={(event) => {
                        setSelectedUserProfileId(
                          event.target.value
                        );
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-white bg-black px-3 py-2 text-xs text-white placeholder:text-zinc-500"
                    >
                      <option value="">
                        Choose existing chat profile
                      </option>

                      {availableUserProfiles.map(
                        (profile) => (
                          <option
                            key={profile.id}
                            value={profile.id}
                          >
                            {profile.displayName}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      disabled={!canCaptureFaceSample}
                      onClick={
                        handleCaptureFaceSample
                      }
                      className={[
                        "rounded-lg border border-white px-3 py-2 text-xs font-bold text-white transition",
                        canCaptureFaceSample
                          ? "bg-blue-600 hover:bg-blue-700"
                          : noFaceReadyForSample
                            ? "cursor-not-allowed bg-red-700"
                            : "cursor-not-allowed bg-zinc-800 opacity-50",
                      ].join(" ")}
                    >
                      {noFaceReadyForSample
                        ? "No face detected"
                        : "Capture face sample"}
                    </button>
                  </div>

                  {availableUserProfiles.length ===
                    0 && (
                    <div className="text-[10px] text-amber-300">
                      Create a user profile in Robot Chat before enrolling a face.
                    </div>
                  )}

                  <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-[10px]">
                    {faceIdentityStatus}
                    {lastRecognizedName
                      ? ` (${lastRecognizedName})`
                      : ""}
                  </div>

                  <div className="text-[10px] text-zinc-400">
                    Recognition model:{" "}
                    {faceIdentityRecognitionStatus}
                    {faceIdentityDetectionConfidence >
                    0
                      ? ` · face confidence ${percentageLabel(
                          faceIdentityDetectionConfidence
                        )}`
                      : ""}
                  </div>

                  {faceIdentityRecognitionError && (
                    <div className="rounded-lg bg-red-950 px-3 py-2 text-[10px] font-semibold text-white">
                      {faceIdentityRecognitionError}
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                      Known people
                    </div>

                    {faceIdentityProfiles.length ===
                    0 ? (
                      <div className="mt-1 text-[10px] text-zinc-400">
                        No enrolled people.
                      </div>
                    ) : (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {faceIdentityProfiles.map(
                          (profile) => (
                            <div
                              key={profile.id}
                              className="rounded-lg border border-zinc-700 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 text-[10px]">
                                  <span className="font-bold">
                                    {profile.displayName}
                                  </span>
                                  <span className="ml-2 text-zinc-400">
                                    {
                                      profile
                                        .descriptors
                                        .length
                                    }
                                    /
                                    {
                                      FACE_IDENTITY_MIN_SAMPLES
                                    }{" "}
                                    samples
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setPendingDeleteFaceProfileId(
                                      profile.id
                                    );
                                    setDeleteFacePasscode(
                                      ""
                                    );
                                  }}
                                  className="shrink-0 rounded border border-red-400 px-2 py-1 text-[10px] font-bold text-red-300 hover:bg-red-500 hover:text-white"
                                >
                                  Delete
                                </button>
                              </div>

                              {pendingDeleteFaceProfileId ===
                                profile.id && (
                                <div className="mt-2 grid gap-2">
                                  <input
                                    type="password"
                                    value={
                                      deleteFacePasscode
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      setDeleteFacePasscode(
                                        event
                                          .target
                                          .value
                                      )
                                    }
                                    onKeyDown={(
                                      event
                                    ) => {
                                      if (
                                        event.key ===
                                        "Enter"
                                      ) {
                                        handleConfirmDeleteFaceProfile(
                                          profile
                                        );
                                      }
                                    }}
                                    placeholder="Teacher passcode"
                                    className="rounded-lg border border-white bg-black px-3 py-2 text-xs text-white placeholder:text-zinc-500"
                                  />

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleConfirmDeleteFaceProfile(
                                          profile
                                        )
                                      }
                                      className="rounded border border-red-400 px-2 py-1 text-[10px] font-bold text-red-300 hover:bg-red-500 hover:text-white"
                                    >
                                      Confirm delete
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPendingDeleteFaceProfileId(
                                          ""
                                        );
                                        setDeleteFacePasscode(
                                          ""
                                        );
                                      }}
                                      className="rounded border border-white px-2 py-1 text-[10px] font-bold text-white hover:bg-white hover:text-black"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div
                  className={[
                    "rounded-lg px-3 py-2 font-bold text-white",
                    faceDetectionStatusClass(
                      faceDetectionStatus,
                      faceDetected
                    ),
                  ].join(" ")}
                >
                  {faceDetectionStatusLabel(
                    faceDetectionStatus,
                    faceDetected
                  )}
                </div>

                <div className="rounded-lg bg-black px-3 py-2 font-semibold text-white">
                  Faces: {faceCount}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-700 bg-black p-2 text-[11px] text-white">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={[
                      "rounded-lg px-3 py-2 font-bold text-white",
                      expressionSignalClass(
                        expressionSignal
                      ),
                    ].join(" ")}
                  >
                    {expressionSignalLabel(
                      expressionSignal
                    )}
                  </div>

                  <div className="rounded-lg bg-zinc-950 px-3 py-2 font-semibold text-white">
                    Confidence:{" "}
                    {percentageLabel(
                      expressionConfidence
                    )}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[
                    [
                      "Smile",
                      expressionScores.smile,
                    ],
                    [
                      "Surprise",
                      expressionScores.surprise,
                    ],
                    [
                      "Tongue",
                      expressionScores.tongueOut,
                    ],
                    [
                      "Upset",
                      expressionScores.upset,
                    ],
                    [
                      "Upset brow",
                      expressionScores.upsetBrow,
                    ],
                    [
                      "Upset tension",
                      expressionScores.upsetTension,
                    ],
                    [
                      "Sad total",
                      expressionScores.sad,
                    ],
                    [
                      "Sad mouth",
                      expressionScores.sadMouth,
                    ],
                    [
                      "Sad eyes",
                      expressionScores.sadEyes,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg bg-zinc-950 px-3 py-2"
                    >
                      <span className="font-bold">
                        {label}:
                      </span>{" "}
                      {percentageLabel(
                        value as number
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {cameraEmotionControlEnabled &&
                lastCameraDecision && (
                  <div className="rounded-xl border border-fuchsia-700 bg-black p-3 text-xs text-white">
                    <div className="grid gap-2">
                      <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                          Camera saw
                        </div>

                        <div className="mt-1 font-bold text-white">
                          {expressionSignalLabel(
                            lastCameraDecision?.signal ??
                              "neutral"
                          )}{" "}
                          ·{" "}
                          {percentageLabel(
                            lastCameraDecision?.confidence ??
                              0
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                          Robot interpreted
                        </div>

                        <div className="mt-1 text-base font-bold text-white">
                          {
                            lastCameraDecision?.emotionLabel ??
                              ""
                          }
                        </div>
                      </div>

                      <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                          Why
                        </div>

                        <div className="mt-1 leading-5 text-white">
                          {lastCameraDecision?.reason ??
                            ""}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                </>
              )}

              {faceDetectionErrorMessage && (
                <div className="rounded-lg bg-red-950 px-3 py-2 text-[11px] font-semibold text-white">
                  {faceDetectionErrorMessage}
                </div>
              )}

              {!isCameraSupported && (
                <div className="rounded-lg bg-red-950 px-3 py-2 text-[11px] font-semibold text-white">
                  This browser does not support camera access.
                </div>
              )}

              {cameraErrorMessage && (
                <div className="rounded-lg bg-red-950 px-3 py-2 text-[11px] font-semibold text-white">
                  {cameraErrorMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={showKnownPeople}
        toggleDialog={() =>
          setShowKnownPeople(false)
        }
      >
        <div className="flex max-h-[88vh] w-[min(94vw,720px)] flex-col gap-4 overflow-hidden bg-black p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                Known people list
              </h2>

              <p className="mt-1 text-xs text-zinc-300">
                Faces enrolled locally for existing Robot Chat profiles.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowKnownPeople(false)
              }
              className="rounded border border-white bg-black px-3 py-1 text-xs font-bold text-white transition hover:bg-white hover:text-black"
            >
              Close
            </button>
          </div>

          <div className="min-h-0 overflow-auto pr-1">
            {faceIdentityProfiles.length === 0 ? (
              <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-300">
                No enrolled people yet.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {faceIdentityProfiles.map(
                  (profile) => (
                    <div
                      key={profile.id}
                      className="rounded-xl border border-sky-400/70 bg-sky-950/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-white">
                            {profile.displayName}
                          </div>

                          <div className="mt-1 text-[11px] text-sky-100/80">
                            {profile.descriptors.length}/
                            {FACE_IDENTITY_MIN_SAMPLES} samples saved
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setPendingDeleteFaceProfileId(
                              profile.id
                            );
                            setDeleteFacePasscode("");
                          }}
                          className="shrink-0 rounded border border-red-400 px-2 py-1 text-[10px] font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
                        >
                          Delete
                        </button>
                      </div>

                      {pendingDeleteFaceProfileId ===
                        profile.id && (
                        <div className="mt-3 grid gap-2">
                          <input
                            type="password"
                            value={deleteFacePasscode}
                            onChange={(event) =>
                              setDeleteFacePasscode(
                                event.target.value
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                handleConfirmDeleteFaceProfile(
                                  profile
                                );
                              }
                            }}
                            placeholder="Teacher passcode"
                            className="rounded-lg border border-white bg-black px-3 py-2 text-xs text-white placeholder:text-zinc-500"
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleConfirmDeleteFaceProfile(
                                  profile
                                )
                              }
                              className="rounded border border-red-400 px-2 py-1 text-[10px] font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
                            >
                              Confirm delete
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPendingDeleteFaceProfileId(
                                  ""
                                );
                                setDeleteFacePasscode("");
                              }}
                              className="rounded border border-white px-2 py-1 text-[10px] font-bold text-white transition hover:bg-white hover:text-black"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </Dialog>

      <SensorCard
      title="Camera Vision"
      icon={<FaCamera size={16} />}
      onStart={() => {}}
      onStop={() => {}}
      isConnected={isCameraActive}
      lastUpdated={
        lastCameraDecision
          ? new Date().toISOString()
          : undefined
      }
    >
      <div className="absolute right-4 top-4">
        <button
          onClick={handleDelete}
          className="rounded p-2 text-red-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-700"
          title="Delete widget"
          type="button"
        >
          <FaTrash size={12} />
        </button>
      </div>

      <div className="flex h-full w-full flex-col gap-2 p-3 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={
                !isCameraSupported ||
                cameraStatus === "requesting"
              }
              onClick={() => {
                if (isCameraActive) {
                  stopCamera();
                } else {
                  void startCamera();
                }
              }}
              className={[
                "rounded-lg border px-3 py-1.5 text-xs font-bold text-white transition",
                isCameraActive
                  ? "bg-emerald-700 hover:bg-emerald-600"
                  : "bg-red-700 hover:bg-red-600",
                !isCameraSupported ||
                cameraStatus === "requesting"
                  ? "cursor-not-allowed opacity-50"
                  : "",
              ].join(" ")}
              style={{
                backgroundColor:
                  cameraStatus === "requesting"
                    ? "#334155"
                    : isCameraActive
                      ? "#047857"
                      : "#b91c1c",
                borderColor:
                  isCameraActive
                    ? "#6ee7b7"
                    : "#fca5a5",
                color: "#ffffff",
              }}
            >
              {cameraStatus === "requesting"
                ? "Camera: Opening..."
                : isCameraActive
                  ? "Camera: On"
                  : "Camera: Off"}
            </button>
          </div>

          <button
            type="button"
            disabled={!isCameraActive}
            onClick={() => {
              setCameraEmotionControlEnabled(
                (current) => !current
              );
            }}
            className={[
              "rounded-lg border px-3 py-1.5 text-xs font-bold text-white transition",
              cameraEmotionControlEnabled
                ? "bg-emerald-700 hover:bg-emerald-600"
                : "bg-red-700 hover:bg-red-600",
              !isCameraActive
                ? "cursor-not-allowed opacity-50"
                : "",
            ].join(" ")}
            style={{
              backgroundColor:
                cameraEmotionControlEnabled
                  ? "#047857"
                  : "#b91c1c",
              borderColor:
                cameraEmotionControlEnabled
                  ? "#6ee7b7"
                  : "#fca5a5",
              color: "#ffffff",
            }}
          >
            Connect camera with emotion widget:{" "}
            {cameraEmotionControlEnabled
              ? "On"
              : "Off"}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-300 bg-black dark:border-slate-700">
          {isCameraActive ? (
            <video
              ref={cameraVideoRef}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full scale-x-[-1] bg-black object-cover"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center px-3 text-center text-[11px] font-semibold text-white">
              The camera will appear here after you allow camera permission.
            </div>
          )}
        </div>

        {recognitionGreeting && (
          <div className="rounded-xl border border-white bg-black px-3 py-2 text-center text-xs font-bold text-white">
            {recognitionGreeting}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              handleOpenFaceSetup();
            }}
            className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
          >
            Recognize face
          </button>

          <button
            type="button"
            onClick={() => {
              setShowKnownPeople(true);
            }}
            className="w-full rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-600"
          >
            See known people list
          </button>
        </div>

        {false && showVisionOptions && (
          <>
            <div className="rounded-xl border border-white bg-black p-3 text-white">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-bold">
                    Face recognition
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    !faceTeacherUnlocked ||
                    !isCameraActive
                  }
                  onClick={() => {
                    setFaceRecognitionEnabled(
                      (current) => !current
                    );
                  }}
                  className={[
                    "shrink-0 rounded-lg border border-white px-3 py-1.5 text-xs font-bold text-white transition",
                    faceRecognitionEnabled
                      ? "bg-emerald-700"
                      : "bg-zinc-800",
                    !faceTeacherUnlocked ||
                    !isCameraActive
                      ? "cursor-not-allowed opacity-50"
                      : "",
                  ].join(" ")}
                >
                  {faceRecognitionEnabled
                    ? "On"
                    : "Off"}
                </button>
              </div>

              {!faceTeacherUnlocked ? (
                <div className="mt-3 flex gap-2">
                  <input
                    type="password"
                    value={faceTeacherPasscode}
                    onChange={(event) => {
                      setFaceTeacherPasscode(
                        event.target.value
                      );
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleUnlockFaceTeacherMode();
                      }
                    }}
                    placeholder="Teacher passcode"
                    className="min-w-0 flex-1 rounded-lg border border-white bg-black px-3 py-2 text-xs text-white placeholder:text-zinc-500"
                  />

                  <button
                    type="button"
                    onClick={
                      handleUnlockFaceTeacherMode
                    }
                    className="rounded-lg border border-white bg-zinc-900 px-3 py-2 text-xs font-bold text-white"
                  >
                    Unlock
                  </button>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={
                        selectedUserProfileId
                      }
                      onChange={(event) => {
                        setSelectedUserProfileId(
                          event.target.value
                        );
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-white bg-black px-3 py-2 text-xs text-white placeholder:text-zinc-500"
                    >
                      <option value="">
                        Choose existing chat profile
                      </option>

                      {availableUserProfiles.map(
                        (profile) => (
                          <option
                            key={profile.id}
                            value={profile.id}
                          >
                            {profile.displayName}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      disabled={
                        !canCaptureFaceSample
                      }
                      onClick={
                        handleCaptureFaceSample
                      }
                      className={[
                        "rounded-lg border border-white px-3 py-2 text-xs font-bold text-white transition",
                        canCaptureFaceSample
                          ? "bg-blue-600 hover:bg-blue-700"
                          : noFaceReadyForSample
                            ? "cursor-not-allowed bg-red-700"
                            : "cursor-not-allowed bg-zinc-800 opacity-50",
                      ].join(" ")}
                    >
                      {noFaceReadyForSample
                        ? "No face detected"
                        : "Capture face sample"}
                    </button>
                  </div>

                  {availableUserProfiles.length ===
                    0 && (
                    <div className="text-[10px] text-amber-300">
                      Create a user profile in Robot Chat before enrolling a face.
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-300">
                      Teacher controls unlocked
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setFaceTeacherUnlocked(false);
                        setFaceTeacherPasscode("");
                      }}
                      className="text-[10px] font-bold text-zinc-300 underline"
                    >
                      Lock
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-[10px]">
                {faceIdentityStatus}
                {lastRecognizedName
                  ? ` (${lastRecognizedName})`
                  : ""}
              </div>

              <div className="mt-2 text-[10px] text-zinc-400">
                Recognition model:{" "}
                {faceIdentityRecognitionStatus}
                {faceIdentityDetectionConfidence >
                  0
                  ? ` · face confidence ${percentageLabel(
                      faceIdentityDetectionConfidence
                    )}`
                  : ""}
              </div>

              {faceIdentityRecognitionError && (
                <div className="mt-2 rounded-lg bg-red-950 px-3 py-2 text-[10px] font-semibold text-white">
                  {faceIdentityRecognitionError}
                </div>
              )}

              <div className="mt-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                  Known people
                </div>

                {faceIdentityProfiles.length === 0 ? (
                  <div className="mt-1 text-[10px] text-zinc-400">
                    No enrolled people.
                  </div>
                ) : (
                  <div className="mt-1 space-y-1">
                    {faceIdentityProfiles.map(
                      (profile) => (
                        <div
                          key={profile.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-zinc-700 px-2 py-1.5"
                        >
                          <div className="min-w-0 text-[10px]">
                            <span className="font-bold">
                              {profile.displayName}
                            </span>
                            <span className="ml-2 text-zinc-400">
                              {profile.descriptors.length}/
                              {FACE_IDENTITY_MIN_SAMPLES} samples
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={
                              !faceTeacherUnlocked
                            }
                            onClick={() => {
                              if (
                                !faceTeacherUnlocked
                              ) {
                                return;
                              }

                              deleteFaceIdentityProfile(
                                profile.id
                              );
                              setFaceIdentityProfiles(
                                getFaceIdentityProfiles()
                              );
                              setFaceIdentityStatus(
                                `${profile.displayName} was deleted.`
                              );
                            }}
                            className={[
                              "shrink-0 rounded border border-white px-2 py-1 text-[10px] font-bold",
                              !faceTeacherUnlocked
                                ? "cursor-not-allowed opacity-40"
                                : "",
                            ].join(" ")}
                          >
                            Delete
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div
                className={[
                  "rounded-lg px-3 py-2 font-bold text-white",
                  faceDetectionStatusClass(
                    faceDetectionStatus,
                    faceDetected
                  ),
                ].join(" ")}
              >
                {faceDetectionStatusLabel(
                  faceDetectionStatus,
                  faceDetected
                )}
              </div>

              <div className="rounded-lg bg-black px-3 py-2 font-semibold text-white">
                Faces: {faceCount}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-black p-2 text-[11px] text-white">
              <div className="flex items-center justify-between gap-2">
                <div
                  className={[
                    "rounded-lg px-3 py-2 font-bold text-white",
                    expressionSignalClass(
                      expressionSignal
                    ),
                  ].join(" ")}
                >
                  {expressionSignalLabel(
                    expressionSignal
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2 font-semibold text-white">
                  Confidence: {" "}
                  {percentageLabel(
                    expressionConfidence
                  )}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Smile:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.smile
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Surprise:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.surprise
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Tongue:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.tongueOut
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Upset:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.upset
                  )}
                </div>


              <div className="rounded-lg bg-zinc-950 px-3 py-2">
                <span className="font-bold">
                  Upset brow:
                </span>{" "}
                {percentageLabel(
                  expressionScores.upsetBrow
                )}
              </div>

              <div className="rounded-lg bg-zinc-950 px-3 py-2">
                <span className="font-bold">
                  Upset tension:
                </span>{" "}
                {percentageLabel(
                  expressionScores.upsetTension
                )}
              </div>
                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Sad total:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.sad
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Sad mouth:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.sadMouth
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Sad eyes:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.sadEyes
                  )}
                </div>
              </div>
            </div>

            {cameraEmotionControlEnabled &&
              lastCameraDecision && (
                <div className="rounded-xl border border-fuchsia-700 bg-black p-3 text-xs text-white">
                  <div className="grid gap-2">
                    <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                        Camera saw
                      </div>

                      <div className="mt-1 font-bold text-white">
                        {expressionSignalLabel(
                          lastCameraDecision?.signal ??
                            "neutral"
                        )}{" "}
                        · {" "}
                        {percentageLabel(
                          lastCameraDecision?.confidence ??
                            0
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                        Robot interpreted
                      </div>

                      <div className="mt-1 text-base font-bold text-white">
                        {lastCameraDecision?.emotionLabel}
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                        Why
                      </div>

                      <div className="mt-1 leading-5 text-white">
                        {lastCameraDecision?.reason}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {faceDetectionErrorMessage && (
              <div className="rounded-lg bg-red-950 px-3 py-2 text-[11px] font-semibold text-white">
                {faceDetectionErrorMessage}
              </div>
            )}

            {!isCameraSupported && (
              <div className="rounded-lg bg-red-950 px-3 py-2 text-[11px] font-semibold text-white">
                This browser does not support camera access.
              </div>
            )}

            {cameraErrorMessage && (
              <div className="rounded-lg bg-red-950 px-3 py-2 text-[11px] font-semibold text-white">
                {cameraErrorMessage}
              </div>
            )}
          </>
        )}
      </div>
    </SensorCard>
    </>
  );
};


export default CameraVisionWidget;
