from EmotionLib import (
    Emotion,
    EmotionDefinition,
    EmotionOutputHub,
    RedVisionEmotionDisplay,
    XPPEmotionPublisher,
)

from XRPLib.board import Board

import sys
import time

try:
    import select
except ImportError:
    import uselect as select


VOICE_PREFIX = "__VOICE_CMD__:"

TURN_EFFORT = 0.22
TURN_TIME_MS = 450

USE_RED_VISION = True


board = Board.get_default_board()

emotionPublisher = XPPEmotionPublisher()

redVisionEmotionDisplay = (
    RedVisionEmotionDisplay(
        sheets_directory="/emotion_sheets_192",
        custom_sheets_directory="/emotion_sheets_custom",
        strict_assets=False,
        cache_capacity=4,
        debug=False,
        enabled=USE_RED_VISION,
        strict_display=False,
    )
)

emotionOutputs = EmotionOutputHub(
    emotionPublisher.publish_state,
    redVisionEmotionDisplay.apply_state,
    strict=False,
)

emotion = Emotion(
    publisher=emotionOutputs.publish_state,
    min_time_before_switch_ms=0,
)

emotion.register_definition(
    EmotionDefinition(
        name="happy",
        emotion_id=1,
        playback_fps=10,
        frame_subset=None,
        min_time_before_switch_ms=None,
        repeat_mode="ping_pong",
        repeat_count=None,
        flag_overrides=("dashboard_screen",),
    )
)

emotion.register_definition(
    EmotionDefinition(
        name="sad",
        emotion_id=9,
        playback_fps=10,
        frame_subset=None,
        min_time_before_switch_ms=None,
        repeat_mode="ping_pong",
        repeat_count=None,
        flag_overrides=("dashboard_screen",),
    )
)


def get_drivetrain():
    return getattr(
        board,
        "drivetrain",
        None,
    )


drivetrain = get_drivetrain()


def stop_drive():
    if drivetrain is None:
        return

    try:
        drivetrain.stop()
        return
    except Exception:
        pass

    try:
        drivetrain.set_effort(0, 0)
    except Exception:
        pass


def turn_robot(direction):
    if drivetrain is None:
        print("VOICE_ERROR no drivetrain")
        return

    if direction == "right":
        left_effort = TURN_EFFORT
        right_effort = -TURN_EFFORT
    else:
        left_effort = -TURN_EFFORT
        right_effort = TURN_EFFORT

    print("VOICE_TURN", direction)

    try:
        drivetrain.set_effort(
            left_effort,
            right_effort,
        )

        start_ms = time.ticks_ms()

        while (
            time.ticks_diff(
                time.ticks_ms(),
                start_ms,
            )
            < TURN_TIME_MS
        ):
            redVisionEmotionDisplay.update()
            time.sleep_ms(20)

    finally:
        stop_drive()


def show_emotion(name):
    print("VOICE_EMOTION", name)

    emotion.set_emotion(
        name,
        force_reset=True,
    )

    emotion.run_emotion()


def read_voice_command():
    try:
        readable, _, _ = select.select(
            [sys.stdin],
            [],
            [],
            0,
        )
    except Exception:
        return None

    if not readable:
        return None

    line = sys.stdin.readline()

    if not line:
        return None

    line = line.strip()

    if not line.startswith(
        VOICE_PREFIX
    ):
        return None

    return line[
        len(VOICE_PREFIX):
    ].strip()


def apply_voice_command(command):
    if command == "turn_happy":
        show_emotion("happy")
        return

    if command == "turn_sad":
        show_emotion("sad")
        return

    if command == "turn_right":
        turn_robot("right")
        return

    if command == "turn_left":
        turn_robot("left")
        return

    print("VOICE_UNKNOWN", command)


print("Voice command demo ready.")
print("Say: turn happy, turn sad, turn right, turn left.")

show_emotion("happy")

while True:
    command = read_voice_command()

    if command is not None:
        apply_voice_command(command)

    redVisionEmotionDisplay.update()

    time.sleep_ms(20)
