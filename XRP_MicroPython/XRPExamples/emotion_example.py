from XRPLib.emotion import Emotion
import time


def print_emotion_message(message):
    print("Emotion message:")
    print(message)


emotion = Emotion.get_default_emotion()

emotion.set_publisher(
    print_emotion_message
)

emotion.set_min_time_before_switch(
    1000
)


print("Start happy")

emotion.set_emotion("happy")

print(
    "Changed:",
    emotion.run_emotion()
)


print("Request happy repeatedly")

for _ in range(3):
    emotion.set_emotion("happy")

    print(
        "Changed:",
        emotion.run_emotion()
    )

    time.sleep(0.2)


print("Request nervous too early")

emotion.set_emotion("nervous")

print(
    "Changed:",
    emotion.run_emotion()
)


print("Wait minimum switch time")

time.sleep(1.1)

print(
    "Changed:",
    emotion.run_emotion()
)


print("Force reset nervous")

emotion.set_emotion(
    "nervous",
    force_reset=True,
)

print(
    "Changed:",
    emotion.run_emotion()
)