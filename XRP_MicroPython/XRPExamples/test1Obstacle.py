from XRPLib.differential_drive import DifferentialDrive
from XRPLib.rangefinder import Rangefinder
from XRPLib.emotion import Emotion

import time

drive = DifferentialDrive.get_default_differential_drive()
rangefinder = Rangefinder.get_default_rangefinder()

emotion = Emotion.get_default_emotion()

SHAKE_SPEED = 0.25

shake_direction = 1
last_toggle = time.ticks_ms()

try:

    while True:

        distance = rangefinder.distance()

        # MUY CERCA
        if distance < 5:

            drive.stop()

            emotion.set_emotion("lost")
            emotion.run_emotion()

        # CERCA
        elif distance < 15:

            emotion.set_emotion("nervous")
            emotion.run_emotion()

            now = time.ticks_ms()

            if time.ticks_diff(now, last_toggle) > 120:
                shake_direction *= -1
                last_toggle = now

            drive.arcade(
                0.0,
                SHAKE_SPEED * shake_direction
            )

        # LIBRE
        else:

            emotion.set_emotion("happy")
            emotion.run_emotion()

            drive.arcade(
                0.35,
                0.0
            )

        time.sleep(0.02)

finally:
    drive.stop()