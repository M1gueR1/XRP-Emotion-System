import time

try:
    from EmotionLib import EmotionHardwareConfig

    hardware = EmotionHardwareConfig(
        drive_left_port="L",
        drive_right_port="R",
    )

    drive = hardware.create_drivetrain()
    drive.stop()

except Exception:
    pass

print("XRP ready. Connect from XRPWeb and run a program.")

while True:
    time.sleep(1)