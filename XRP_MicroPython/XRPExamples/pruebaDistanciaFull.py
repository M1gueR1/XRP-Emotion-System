from XRPLib.board import Board
from XRPLib.rangefinder import Rangefinder

from EmotionLib import (
    Emotion,
    EmotionDefinition,
    EmotionHardwareConfig,
    EmotionMotionController,
    EmotionOutputHub,
    RedVisionEmotionDisplay,
    XPPEmotionPublisher,
)

import time


# --------------------------------------------------
# Configuration
# --------------------------------------------------

NERVOUS_DISTANCE_CM = 18
LOST_DISTANCE_CM = 7

HAPPY_SPEED = 0.2

# Small correction because the left motor is
# slightly faster than the right motor.
HAPPY_TURN_TRIM = 0

LOOP_DELAY_MS = 20


# --------------------------------------------------
# Hardware
# --------------------------------------------------

hardware = EmotionHardwareConfig(
    drive_left_port="L",
    drive_right_port="R",
    invert_left=False,
    invert_right=False,
    use_imu=True,
)

drive = hardware.create_drivetrain()

board = Board.get_default_board()

rangefinder = (
    Rangefinder
    .get_default_rangefinder()
)


# Give the IMU and drivetrain time to initialize.
time.sleep_ms(500)


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def drive_happy():
    """
    Move forward with a small steering correction.

    Positive trim slightly reduces the effect of the
    faster left side and helps the XRP travel straight.
    """
    drive.arcade(
        HAPPY_SPEED,
        HAPPY_TURN_TRIM,
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
# Emotion framework
# --------------------------------------------------

motion = EmotionMotionController(
    drive
)

emotion = Emotion(
    publisher=(
        emotion_outputs.publish_state
    ),
    min_time_before_switch_ms=0,
)

emotion.set_motion_controller(
    motion
)


# --------------------------------------------------
# Definitions
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
            "drivetrain",
        ),
    )
)

emotion.configure_motion(
    "frustrated",
    steps=(
        (
            100,
            0.18,
            0.26,
        ),
        (
            100,
            0.18,
            -0.26,
        ),
        (
            90,
            0.1,
            0.2,
        ),
        (
            90,
            0.1,
            -0.2,
        ),
    ),
    repeat=True,
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
# Initialize dashboard communication
# --------------------------------------------------

publisher.reset_definitions()
publisher.define_variables()

time.sleep_ms(300)


# --------------------------------------------------
# Preload animations
# --------------------------------------------------

print("Preloading display emotions")

red_vision_display.preload(
    (
        "happy",
        "frustrated",
        "sad",
    )
)

print(
    "Cached emotions:",
    red_vision_display
    .get_cached_emotions(),
)


# --------------------------------------------------
# Program
# --------------------------------------------------

print("Press button to start")

board.wait_for_button()

while board.is_button_pressed():
    time.sleep_ms(20)


try:
    while not board.is_button_pressed():

        distance = (
            rangefinder.distance()
        )


        # ------------------------------------------
        # Determine target emotion
        # ------------------------------------------

        if (
            distance <= 0
            or distance
            <= LOST_DISTANCE_CM
        ):
            target_emotion = "sad"

        elif (
            distance
            <= NERVOUS_DISTANCE_CM
        ):
            target_emotion = (
                "frustrated"
            )

        else:
            target_emotion = "happy"


        active_emotion = (
            emotion
            .get_active_emotion()
        )


        # ------------------------------------------
        # Transition preparation
        # ------------------------------------------

        if (
            target_emotion == "sad"
            and active_emotion != "sad"
        ):
            # Sad is a safety state, so stop before
            # applying the emotion.
            emotion.stop_motion()
            drive.stop()


        elif (
            active_emotion
            == "frustrated"
            and target_emotion
            == "happy"
        ):
            # Cancel the previous nervous turn and
            # immediately resume corrected forward
            # movement.
            emotion.stop_motion()

            drive_happy()


        # ------------------------------------------
        # Apply emotion
        # ------------------------------------------

        emotion.set_emotion(
            target_emotion
        )

        emotion.run_emotion()


        # ------------------------------------------
        # Normal movement
        # ------------------------------------------

        if not (
            emotion
            .is_overriding_drive()
        ):
            if (
                emotion
                .get_active_emotion()
                == "happy"
            ):
                drive_happy()

            else:
                drive.stop()


        # Advance the physical display animation.
        red_vision_display.update()

        time.sleep_ms(
            LOOP_DELAY_MS
        )


finally:
    emotion.stop_motion()

    drive.stop()

    red_vision_display.stop()

    print("Stopped")