from EmotionLib import (
    Emotion,
    EmotionDefinition,
    XPPEmotionPublisher,
)

import time


publisher = XPPEmotionPublisher()

emotion = Emotion(
    publisher=publisher.publish_state,
    min_time_before_switch_ms=0,
)


emotion.register_definition(
    EmotionDefinition(
        name="happy",
        emotion_id=1,
        playback_fps=4,
        frame_subset=(
            0,
            1,
            2,
            3,
        ),
        repeat_mode="loop",
        flag_overrides=(
            "dashboard_screen",
        ),
    )
)


emotion.register_definition(
    EmotionDefinition(
        name="nervous",
        emotion_id=2,
        playback_fps=7,
        frame_subset=(
            0,
            1,
            2,
            1,
        ),
        repeat_mode="count",
        repeat_count=3,
        flag_overrides=(
            "dashboard_screen",
            "drivetrain",
        ),
    )
)


emotion.register_definition(
    EmotionDefinition(
        name="lost",
        emotion_id=3,
        playback_fps=3,
        frame_subset=(
            0,
            2,
            3,
        ),
        repeat_mode="once",
        flag_overrides=(
            "dashboard_screen",
        ),
    )
)


print("Advanced Happy")
emotion.set_emotion("happy")
emotion.run_emotion()
time.sleep(4)


print("Advanced Nervous")
emotion.set_emotion("nervous")
emotion.run_emotion()
time.sleep(5)


print("Advanced Lost")
emotion.set_emotion("lost")
emotion.run_emotion()
time.sleep(4)


print("Force reset Lost")
emotion.set_emotion(
    "lost",
    force_reset=True,
)
emotion.run_emotion()
time.sleep(4)


print("Advanced XPP test complete")
