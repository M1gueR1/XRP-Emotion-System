from EmotionLib import (
    Emotion,
    EmotionDefinition,
    EmotionOutputHub,
    RedVisionEmotionDisplay,
    XPPEmotionPublisher,
)
from EmotionLib.voice_command_receiver import VoiceCommandReceiver
from XRPLib.board import Board
import time


USE_RED_VISION = True

board = Board.get_default_board()
voiceCommandReceiver = VoiceCommandReceiver()

emotionPublisher = XPPEmotionPublisher()

redVisionEmotionDisplay = RedVisionEmotionDisplay(
    sheets_directory="/emotion_sheets_192",
    custom_sheets_directory="/emotion_sheets_custom",
    strict_assets=False,
    cache_capacity=4,
    debug=False,
    enabled=USE_RED_VISION,
    strict_display=False,
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
        name="excited",
        emotion_id=3,
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


def show_emotion(name):
    emotion.set_emotion(
        name,
        force_reset=True,
    )
    emotion.run_emotion()


print("Voice phrase intro demo running.")
print("Try:")
print("- Hi XRP, how are you doing?")
print("- Hello XRP")
print("- What's up")
print("- Are you ready for today?")
print("- turn happy")
print("- turn sad")
print("- turn excited")
print("Press the XRP button to stop.")

show_emotion("happy")

while not board.is_button_pressed():
    voiceCommand = voiceCommandReceiver.poll()

    if voiceCommand == "turn_happy":
        print("VOICE -> happy")
        show_emotion("happy")

    elif voiceCommand == "turn_excited":
        print("VOICE -> excited")
        show_emotion("excited")

    elif voiceCommand == "turn_sad":
        print("VOICE -> sad")
        show_emotion("sad")

    redVisionEmotionDisplay.update()
    time.sleep_ms(20)

print("Voice phrase intro demo stopped.")
