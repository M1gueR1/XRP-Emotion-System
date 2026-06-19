from XRPLib.board import Board
from XRPLib.rangefinder import Rangefinder

from EmotionLib import (
    Emotion,
    EmotionDefinition,
    EmotionHardwareConfig,
    EmotionMotionController,
    XPPEmotionPublisher,
)

import time




NERVOUS_DISTANCE_CM = 18
LOST_DISTANCE_CM = 7

HAPPY_SPEED = 0.55
LOOP_DELAY_SECONDS = 0.02


hardware = EmotionHardwareConfig(
    drive_left_port="L",
    drive_right_port="R",
    invert_left=False,
    invert_right=False,
)

drive = hardware.create_drivetrain()

board = Board.get_default_board()

rangefinder = (
    Rangefinder
    .get_default_rangefinder()
)



publisher = XPPEmotionPublisher()

motion = EmotionMotionController(
    drive
)

emotion = Emotion(
    publisher=publisher.publish_state,
    min_time_before_switch_ms=0,
)

emotion.set_motion_controller(
    motion
)



emotion.register_definition(
    EmotionDefinition(
        name="happy",
        emotion_id=1,
        playback_fps=None,
        frame_subset=None,
        min_time_before_switch_ms=0,
        repeat_mode="loop",
        repeat_count=None,
        flag_overrides=("dashboard_screen",),
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
        flag_overrides=("dashboard_screen", "drivetrain"),
    )
)

emotion.configure_motion(
    "frustrated",
    steps=(
        (130, 0.3, 0.5),
        (130, 0.3, -0.5),
        (110, 0.2, 0.35),
        (110, 0.2, -0.35),
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
        flag_overrides=("dashboard_screen",),
    )
)





print("Press button to start")
board.wait_for_button()

time.sleep(0.5)

print("Running")
print("Press button again to stop")


try:
    while not board.is_button_pressed():
        distance = rangefinder.distance()

        if (
            distance <= 0
            or distance <= LOST_DISTANCE_CM
        ):
            emotion.set_emotion(
                "sad"
            )

        elif distance <= NERVOUS_DISTANCE_CM:
            emotion.set_emotion(
                "frustrated"
            )

        else:
            emotion.set_emotion(
                "happy"
            )

        emotion.run_emotion()

        if not emotion.is_overriding_drive():
            if (
                emotion.get_active_emotion()
                == "happy"
            ):
                drive.arcade(
                    HAPPY_SPEED,
                    0.0,
                )

            else:
                drive.stop()

        time.sleep(
            LOOP_DELAY_SECONDS
        )

finally:
    emotion.stop_motion()
    drive.stop()

    print("Stopped")