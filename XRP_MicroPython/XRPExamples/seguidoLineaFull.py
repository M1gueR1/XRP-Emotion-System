from XRPLib.board import Board
from XRPLib.reflectance import Reflectance

from EmotionLib import (
    Emotion,
    EmotionDefinition,
    EmotionHardwareConfig,
    EmotionOutputHub,
    RedVisionEmotionDisplay,
    XPPEmotionPublisher,
)

import time


# --------------------------------------------------
# Line-following configuration
# --------------------------------------------------

BASE_SPEED = 0.3
MIN_TRACK_SPEED = 0.22

TURN_GAIN = 0.40
SLOWDOWN_GAIN = 0.20

WHITE_THRESHOLD = 0.88
BLACK_THRESHOLD = 0.93

CENTER_DEADBAND = 0.025

# Number of consecutive sensor readings required
# before changing emotion.
CONFIRMATION_HITS = 4

LOOP_DELAY_MS = 20


# --------------------------------------------------
# Hardware
# --------------------------------------------------

hardware = EmotionHardwareConfig(
    drive_left_port="L",
    drive_right_port="R",
    invert_left=False,
    invert_right=False,
)

drive = hardware.create_drivetrain()

board = Board.get_default_board()

reflectance = (
    Reflectance
    .get_default_reflectance()
)


# --------------------------------------------------
# Emotion outputs
# --------------------------------------------------

publisher = XPPEmotionPublisher()

red_vision_display = (
    RedVisionEmotionDisplay(
        sheets_directory=(
            "/emotion_sheets_192"
        ),
        strict_assets=True,
        cache_capacity=4,
        debug=False,
    )
)

emotion_outputs = (
    EmotionOutputHub(
        publisher.publish_state,
        red_vision_display.apply_state,
        strict=False,
    )
)


# --------------------------------------------------
# Emotion Framework
# --------------------------------------------------

# The publisher is assigned later, after XPP and
# the Red Vision cache have been initialized.
emotion = Emotion(
    min_time_before_switch_ms=400,
)


# --------------------------------------------------
# Emotion definitions
# --------------------------------------------------

emotion.register_definition(
    EmotionDefinition(
        name="happy",
        emotion_id=1,
        playback_fps=None,
        frame_subset=None,
        min_time_before_switch_ms=0,
        repeat_mode="loop",
        repeat_count=None,
        flag_overrides=(
            "dashboard_screen",
        ),
    )
)

emotion.register_definition(
    EmotionDefinition(
        name="frustrated",
        emotion_id=7,
        playback_fps=7,
        frame_subset=None,
        min_time_before_switch_ms=0,
        repeat_mode="loop",
        repeat_count=None,
        flag_overrides=(
            "dashboard_screen",
        ),
    )
)

emotion.register_definition(
    EmotionDefinition(
        name="sad",
        emotion_id=9,
        playback_fps=3,
        frame_subset=None,
        min_time_before_switch_ms=0,
        repeat_mode="loop",
        repeat_count=None,
        flag_overrides=(
            "dashboard_screen",
        ),
    )
)


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def clamp(
    value,
    minimum,
    maximum,
):
    if value < minimum:
        return minimum

    if value > maximum:
        return maximum

    return value


def wait_for_button_release():
    while board.is_button_pressed():
        time.sleep_ms(20)


# --------------------------------------------------
# Initialize dashboard communication
# --------------------------------------------------

publisher.reset_definitions()
publisher.define_variables()

time.sleep_ms(300)


# --------------------------------------------------
# Preload Red Vision animations
# --------------------------------------------------

# These sheets remain decoded in RAM while this
# program is running, making emotion changes fast.
red_vision_display.preload(
    (
        "idle",
        "happy",
        "frustrated",
        "sad",
    )
)


# Connect Emotion to both outputs after initialization.
emotion.set_publisher(
    emotion_outputs.publish_state
)

# Publish the initial Idle state.
emotion_outputs.publish_state(
    emotion.get_state()
)


# --------------------------------------------------
# Start
# --------------------------------------------------

print("Press button to start")
board.wait_for_button()
wait_for_button_release()

time.sleep_ms(300)

print("Following white line")
print("Press button again to stop")


pending_emotion = None
pending_hits = 0
requested_emotion = None


# --------------------------------------------------
# Main loop
# --------------------------------------------------

try:
    while not board.is_button_pressed():

        left = (
            reflectance.get_left()
        )

        right = (
            reflectance.get_right()
        )

        line_error = (
            right - left
        )

        absolute_error = abs(
            line_error
        )

        minimum_reflectance = min(
            left,
            right,
        )

        maximum_reflectance = max(
            left,
            right,
        )


        # Both sensors see black.
        both_sensors_black = (
            minimum_reflectance
            >= BLACK_THRESHOLD
        )

        # Both sensors see the white surface and
        # produce similar readings.
        both_sensors_white = (
            maximum_reflectance
            <= WHITE_THRESHOLD
        )


        # ------------------------------------------
        # Determine movement and candidate emotion
        # ------------------------------------------

        if both_sensors_black:

            candidate_emotion = "sad"

            speed = 0.0
            turn = 0.0


        elif (
            both_sensors_white
            and absolute_error
            < CENTER_DEADBAND
        ):

            candidate_emotion = "happy"

            speed = BASE_SPEED
            turn = 0.0


        else:

            candidate_emotion = (
                "frustrated"
            )

            speed = (
                BASE_SPEED
                - (
                    absolute_error
                    * SLOWDOWN_GAIN
                )
            )

            speed = clamp(
                speed,
                MIN_TRACK_SPEED,
                BASE_SPEED,
            )

            turn = clamp(
                line_error * TURN_GAIN,
                -1.0,
                1.0,
            )


        # ------------------------------------------
        # Confirmation filter
        # ------------------------------------------

        if (
            candidate_emotion
            == pending_emotion
        ):
            pending_hits += 1

        else:
            pending_emotion = (
                candidate_emotion
            )

            pending_hits = 1


        # ------------------------------------------
        # Apply confirmed emotion
        # ------------------------------------------

        if (
            pending_hits
            >= CONFIRMATION_HITS
            and candidate_emotion
            != requested_emotion
        ):
            requested_emotion = (
                candidate_emotion
            )

            # Stop immediately before entering Sad.
            if requested_emotion == "sad":
                drive.stop()

            emotion.set_emotion(
                requested_emotion
            )


        # Applies pending changes and publishes them
        # to dashboard and Red Vision.
        emotion.run_emotion()


        # Advances frames on the physical display.
        red_vision_display.update()


        # ------------------------------------------
        # Drive control
        # ------------------------------------------

        drive.arcade(
            speed,
            turn,
        )


        time.sleep_ms(
            LOOP_DELAY_MS
        )


finally:
    drive.stop()

    red_vision_display.stop()

    print("Stopped")