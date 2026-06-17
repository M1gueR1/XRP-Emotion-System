from XRPLib.emotion import Emotion
from XRPLib.emotion_xpp import (
    XPPEmotionPublisher,
)

import time


publisher = XPPEmotionPublisher()

emotion = Emotion(
    publisher=publisher.publish_state,
    min_time_before_switch_ms=500,
)


print("Publishing happy")

emotion.set_emotion("happy")
emotion.run_emotion()

time.sleep(2)


print("Publishing nervous")

emotion.set_emotion("nervous")
emotion.run_emotion()

time.sleep(2)


print("Publishing lost")

emotion.set_emotion("lost")
emotion.run_emotion()

time.sleep(2)


print("Publishing happy")

emotion.set_emotion("happy")
emotion.run_emotion()

time.sleep(2)


print("Force reset happy")

emotion.set_emotion(
    "happy",
    force_reset=True,
)

emotion.run_emotion()


print("Test complete")