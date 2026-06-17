from EmotionLib import (
    Emotion,
    EmotionDefinition,
)


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def print_message(message):
    print("Published state:")
    print(message)


print("Creating default Happy definition")

happy = EmotionDefinition(
    name="happy",
    emotion_id=1,
)

check(
    happy.playback_fps is None,
    "Happy should use the default FPS",
)

check(
    happy.frame_subset is None,
    "Happy should use all frames",
)

check(
    happy.repeat_mode is None,
    "Happy should use default repeat settings",
)

check(
    happy.override_mask() == 0,
    "Happy should not override outputs",
)


print("Creating advanced Nervous definition")

nervous = EmotionDefinition(
    name="nervous",
    emotion_id=2,
    playback_fps=7,
    frame_subset=(
        0,
        1,
        2,
        1,
    ),
    min_time_before_switch_ms=600,
    repeat_mode="loop",
    flag_overrides=(
        "dashboard_screen",
        "drivetrain",
    ),
    motion_steps=(
        (120, 0.18, 0.30),
        (120, 0.18, -0.30),
    ),
    motion_repeat=True,
    required_inputs=(
        "rangefinder",
    ),
)

check(
    nervous.allow_drive_override,
    "Nervous should override drivetrain",
)

check(
    nervous.override_mask() == 513,
    "Expected drivetrain + dashboard mask",
)

check(
    nervous.frame_subset
    == (0, 1, 2, 1),
    "Frame subset was not preserved",
)


print("Checking compatibility alias")

legacy = EmotionDefinition(
    name="legacy",
    emotion_id=4,
    allow_drive_override=True,
)

check(
    legacy.flag_overrides
    == ("drivetrain",),
    "Legacy drive override was not converted",
)


print("Checking repeat validation")

counted = EmotionDefinition(
    name="counted",
    emotion_id=5,
    repeat_mode="count",
    repeat_count=3,
)

check(
    counted.repeat_count == 3,
    "Repeat count was not stored",
)


print("Checking Emotion state")

emotion = Emotion(
    publisher=print_message,
    min_time_before_switch_ms=0,
)

emotion.register_definition(happy)
emotion.register_definition(nervous)
emotion.register_definition(counted)

emotion.set_emotion("happy")
check(
    emotion.run_emotion(),
    "Happy should activate",
)

happy_state = emotion.get_state()

check(
    happy_state["playbackFps"] == 4,
    "Default FPS should resolve to 4",
)

emotion.set_emotion("nervous")
check(
    emotion.run_emotion(),
    "Nervous should activate",
)

nervous_state = emotion.get_state()

check(
    nervous_state["frameSubset"]
    == (0, 1, 2, 1),
    "State should expose frame subset",
)

check(
    nervous_state["repeatMode"]
    == "loop",
    "State should expose repeat mode",
)

check(
    nervous_state["overrideMask"]
    == 513,
    "State should expose override mask",
)


print("Checking invalid combinations")

try:
    EmotionDefinition(
        name="bad_count",
        emotion_id=6,
        repeat_mode="count",
    )

except ValueError:
    print("Invalid count correctly rejected")

else:
    raise AssertionError(
        "Missing repeat_count was accepted"
    )


try:
    EmotionDefinition(
        name="unsafe_motion",
        emotion_id=7,
        motion_steps=(
            (100, 0.1, 0.1),
        ),
    )

except ValueError:
    print("Unsafe motion correctly rejected")

else:
    raise AssertionError(
        "Motion without drivetrain override "
        "was accepted"
    )


print("All Emotion parameter tests passed")
