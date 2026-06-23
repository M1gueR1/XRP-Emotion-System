from EmotionLib import (
    Emotion,
    EmotionDefinition,
    EmotionOutputHub,
    RedVisionEmotionDisplay,
    XPPEmotionPublisher,
)

import time


CUSTOM_EMOTION_NAME = "pikachu"
CUSTOM_EMOTION_ID = 200


publisher = XPPEmotionPublisher()

redVisionEmotionDisplay = RedVisionEmotionDisplay(
    sheets_directory="/emotion_sheets_192",
    custom_sheets_directory="/emotion_sheets_custom",
    strict_assets=False,
    cache_capacity=4,
    debug=True,
    enabled=True,
    strict_display=False,
)

emotionOutputs = EmotionOutputHub(
    publisher.publish_state,
    redVisionEmotionDisplay.apply_state,
    strict=False,
)

emotion = Emotion(
    publisher=emotionOutputs.publish_state
)

emotion.register_definition(
    EmotionDefinition(
        name=CUSTOM_EMOTION_NAME,
        emotion_id=CUSTOM_EMOTION_ID,
        playback_fps=4,
        repeat_mode="loop",
        repeat_count=None,
    )
)

print("Showing custom emotion:", CUSTOM_EMOTION_NAME)

emotion.set_emotion(CUSTOM_EMOTION_NAME)
emotion.run_emotion()

while True:
    redVisionEmotionDisplay.update()
    time.sleep_ms(30)
