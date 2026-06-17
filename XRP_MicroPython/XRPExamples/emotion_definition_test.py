from XRPLib.differential_drive import (
    DifferentialDrive,
)

from EmotionLib import (
    Emotion,
    EmotionDefinition,
    EmotionMotionController,
    XPPEmotionPublisher,
)

import time


drive = (
    DifferentialDrive
    .get_default_differential_drive()
)

publisher = XPPEmotionPublisher()

motion = EmotionMotionController(
    drive
)

emotion = Emotion(
    publisher=publisher.publish_state,
    min_time_before_switch_ms=300,
)

emotion.set_motion_controller(
    motion
)


emotion.register_definition(
    EmotionDefinition(
        name="happy",
        emotion_id=1,
        playback_fps=4,
        min_time_before_switch_ms=400,
        required_inputs=(
            "reflectance",
        ),
    )
)


emotion.register_definition(
    EmotionDefinition(
        name="nervous",
        emotion_id=2,
        playback_fps=6,
        min_time_before_switch_ms=400,
        allow_drive_override=True,
        motion_steps=(
            (140, 0.0, 0.28),
            (140, 0.0, -0.28),
            (140, 0.0, 0.20),
            (140, 0.0, -0.20),
        ),
        motion_repeat=True,
        required_inputs=(
            "reflectance",
        ),
    )
)


emotion.register_definition(
    EmotionDefinition(
        name="lost",
        emotion_id=3,
        playback_fps=4,
        min_time_before_switch_ms=600,
        required_inputs=(
            "reflectance",
            "rangefinder",
        ),
    )
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

        if not emotion.is_overriding_drive():
            drive.arcade(
                0.18,
                0.0,
            )

        time.sleep(0.02)

finally:
    emotion.stop_motion()
    drive.stop()

print("Definition test complete")