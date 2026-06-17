from XRPLib.differential_drive import (
    DifferentialDrive,
)
from XRPLib.emotion import Emotion
from XRPLib.emotion_motion import (
    EmotionMotionController,
)
from XRPLib.emotion_xpp import (
    XPPEmotionPublisher,
)

import time


drive = (
    DifferentialDrive
    .get_default_differential_drive()
)

publisher = XPPEmotionPublisher()

emotion = Emotion(
    publisher=publisher.publish_state,
    min_time_before_switch_ms=300,
)

motion = EmotionMotionController(
    drive
)

motion.register_script(
    "nervous",
    steps=(
        (140, 0.0, 0.28),
        (140, 0.0, -0.28),
        (140, 0.0, 0.20),
        (140, 0.0, -0.20),
    ),
    repeat=True,
)

emotion.set_motion_controller(
    motion
)

emotion.set_drive_override(
    "nervous",
    True,
)


start_ms = time.ticks_ms()

try:
    while True:
        elapsed = time.ticks_diff(
            time.ticks_ms(),
            start_ms,
        )

        if elapsed < 2500:
            emotion.set_emotion(
                "happy"
            )

        elif elapsed < 6500:
            emotion.set_emotion(
                "nervous"
            )

        elif elapsed < 9000:
            emotion.set_emotion(
                "lost"
            )

        else:
            break

        emotion.run_emotion()

        # Normal program control is used only when
        # the emotion has not acquired the drive.
        if not emotion.is_overriding_drive():
            drive.arcade(
                0.18,
                0.0,
            )

        time.sleep(0.02)

finally:
    emotion.stop_motion()
    drive.stop()

print("Motion test complete")