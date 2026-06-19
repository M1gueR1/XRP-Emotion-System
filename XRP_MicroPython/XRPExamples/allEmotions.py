from XRPLib.board import Board

from EmotionLib import (
    Emotion,
    EmotionDefinition,
    XPPEmotionPublisher,
)

import time


# Idle is not included here because emotion_id=0
# is reserved internally by EmotionLib.
OFFICIAL_EMOTIONS = (
    ("happy", 1, 6),
    ("chuckled", 2, 7),
    ("excited", 3, 8),
    ("celebration", 4, 8),
    ("amazed", 5, 6),
    ("puzzled", 6, 5),
    ("frustrated", 7, 6),
    ("upset", 8, 5),
    ("sad", 9, 4),
    ("angry", 10, 7),
    ("love_it", 11, 6),
    ("in_love", 12, 5),
    ("delighted", 13, 6),
    ("ready_to_race", 14, 8),
)


DISPLAY_TIME_MS = 2000
LOOP_DELAY_SECONDS = 0.02


board = Board.get_default_board()

publisher = XPPEmotionPublisher()

emotion = Emotion(
    publisher=publisher.publish_state,
    min_time_before_switch_ms=0,
)


# --------------------------------------------------
# Register official emotions
# --------------------------------------------------

for (
    emotion_name,
    emotion_id,
    emotion_fps,
) in OFFICIAL_EMOTIONS:

    emotion.register_definition(
        EmotionDefinition(
            name=emotion_name,
            emotion_id=emotion_id,
            playback_fps=emotion_fps,
            repeat_mode="loop",
            flag_overrides=(
                "dashboard_screen",
            ),
        )
    )


def wait_while_running(
    duration_ms,
):
    start_time = time.ticks_ms()

    while (
        time.ticks_diff(
            time.ticks_ms(),
            start_time,
        )
        < duration_ms
    ):
        emotion.run_emotion()

        time.sleep(
            LOOP_DELAY_SECONDS
        )


print("Press button to start")
board.wait_for_button()

time.sleep(0.5)


publisher.reset_definitions()
publisher.define_variables()

time.sleep(0.3)


try:

    # --------------------------------------------------
    # Show Idle first
    # --------------------------------------------------

    print("Showing: idle")

    emotion.clear()
    emotion.run_emotion()

    wait_while_running(
        DISPLAY_TIME_MS
    )


    # --------------------------------------------------
    # Show the remaining official emotions
    # --------------------------------------------------

    for (
        emotion_name,
        _,
        _,
    ) in OFFICIAL_EMOTIONS:

        print(
            "Showing:",
            emotion_name,
        )

        emotion.set_emotion(
            emotion_name,
            force_reset=True,
        )

        wait_while_running(
            DISPLAY_TIME_MS
        )


finally:

    # Return to the official Idle face.
    emotion.clear()
    emotion.run_emotion()

    print("Finished")