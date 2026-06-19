import gc
import os
import sys
import time

import cv2 as cv


# Allow this library to find rv_init when it is
# installed inside /lib/EmotionLib.
try:
    from rv_init import (
        display as default_display,
    )
except ImportError:
    RED_VISION_EXAMPLES_PATH = (
        "/red_vision_examples"
    )

    if (
        RED_VISION_EXAMPLES_PATH
        not in sys.path
    ):
        sys.path.append(
            RED_VISION_EXAMPLES_PATH
        )

    from rv_init import (
        display as default_display,
    )


# --------------------------------------------------
# Official emotion assets
# --------------------------------------------------

# Values:
# emotion name: (
#     frame count,
#     default FPS,
#     default repeat mode,
# )

OFFICIAL_EMOTION_ASSETS = {
    "idle": (
        5,
        4,
        "loop",
    ),
    "happy": (
        4,
        6,
        "loop",
    ),
    "chuckled": (
        3,
        7,
        "loop",
    ),
    "excited": (
        4,
        8,
        "loop",
    ),
    "celebration": (
        4,
        8,
        "loop",
    ),
    "amazed": (
        3,
        6,
        "loop",
    ),
    "puzzled": (
        4,
        5,
        "loop",
    ),
    "frustrated": (
        3,
        6,
        "loop",
    ),
    "upset": (
        3,
        5,
        "loop",
    ),
    "sad": (
        3,
        4,
        "loop",
    ),
    "angry": (
        4,
        7,
        "loop",
    ),
    "love_it": (
        2,
        6,
        "loop",
    ),
    "in_love": (
        3,
        5,
        "loop",
    ),
    "delighted": (
        2,
        6,
        "loop",
    ),
    "ready_to_race": (
        2,
        8,
        "loop",
    ),
}


class RedVisionEmotionDisplay:
    """
    Displays EmotionLib states on the SparkFun
    Red Vision display.

    The images are stored locally on the XRP:

        /emotion_assets/happy_0.png
        /emotion_assets/happy_1.png
        ...

    The class loads only the currently active
    emotion into memory.
    """

    def __init__(
        self,
        display=None,
        assets_directory=(
            "/emotion_assets"
        ),
        strict_assets=False,
    ):
        self._display = (
            default_display
            if display is None
            else display
        )

        self._assets_directory = (
            assets_directory.rstrip("/")
        )

        self._strict_assets = (
            strict_assets
        )

        self._active_name = None
        self._generation = -1

        self._frames = []
        self._sequence = ()

        self._sequence_position = 0
        self._direction = 1

        self._playback_fps = 1.0
        self._frame_delay_ms = 1000

        self._repeat_mode = "loop"
        self._repeat_count = None

        self._completed_cycles = 0
        self._playing = False

        self._last_frame_ms = (
            time.ticks_ms()
        )

        self._last_state_signature = (
            None
        )

        self._last_error = None


    @staticmethod
    def _clean_name(
        value,
    ):
        if not isinstance(value, str):
            return "idle"

        clean_value = (
            value.strip().lower()
        )

        if not clean_value:
            return "idle"

        return clean_value


    def _frame_path(
        self,
        emotion_name,
        frame_index,
    ):
        return (
            self._assets_directory
            + "/"
            + emotion_name
            + "_"
            + str(frame_index)
            + ".png"
        )


    def _asset_exists(
        self,
        path,
    ):
        try:
            information = os.stat(
                path
            )

            return (
                information[6] > 0
            )

        except OSError:
            return False


    def _release_frames(self):
        self._frames = []

        gc.collect()


    def _load_frames(
        self,
        emotion_name,
        frame_count,
    ):
        new_frames = []

        print(
            "Loading display emotion:",
            emotion_name,
        )

        for frame_index in range(
            frame_count
        ):
            image_path = (
                self._frame_path(
                    emotion_name,
                    frame_index,
                )
            )

            if not self._asset_exists(
                image_path
            ):
                message = (
                    "Missing display asset: "
                    + image_path
                )

                self._last_error = message

                if self._strict_assets:
                    raise OSError(
                        message
                    )

                print(message)

                new_frames = []
                gc.collect()

                return False

            image = cv.imread(
                image_path
            )

            if image is None:
                message = (
                    "Could not decode display asset: "
                    + image_path
                )

                self._last_error = message

                if self._strict_assets:
                    raise OSError(
                        message
                    )

                print(message)

                new_frames = []
                gc.collect()

                return False

            new_frames.append(
                image
            )

            print(
                "Loaded frame:",
                frame_index,
                image.shape,
            )

            gc.collect()

        self._release_frames()

        self._frames = (
            new_frames
        )

        self._last_error = None

        print(
            "Display emotion loaded:",
            emotion_name,
            len(self._frames),
            "frames",
        )

        return True


    @staticmethod
    def _normalize_subset(
        raw_subset,
        frame_count,
    ):
        if not isinstance(
            raw_subset,
            (list, tuple),
        ):
            return tuple(
                range(frame_count)
            )

        valid_indexes = []

        for frame_index in raw_subset:
            if (
                isinstance(frame_index, bool)
                or not isinstance(
                    frame_index,
                    int,
                )
            ):
                continue

            if (
                0 <= frame_index
                < frame_count
            ):
                valid_indexes.append(
                    frame_index
                )

        if not valid_indexes:
            return tuple(
                range(frame_count)
            )

        return tuple(
            valid_indexes
        )


    def _show_current_frame(self):
        if (
            not self._frames
            or not self._sequence
        ):
            return False

        frame_index = (
            self._sequence[
                self._sequence_position
            ]
        )

        cv.imshow(
            self._display,
            self._frames[
                frame_index
            ],
        )

        return True


    def apply_state(
        self,
        state,
    ):
        """
        Receives a state produced by Emotion.get_state().

        Returns True when the displayed state changed.
        """

        if not isinstance(state, dict):
            raise TypeError(
                "state must be a dictionary"
            )

        requested_name = (
            self._clean_name(
                state.get(
                    "emotionName",
                    "idle",
                )
            )
        )

        if (
            requested_name
            not in OFFICIAL_EMOTION_ASSETS
        ):
            print(
                "Display does not have assets for:",
                requested_name,
            )

            requested_name = "idle"

        (
            frame_count,
            default_fps,
            default_repeat_mode,
        ) = OFFICIAL_EMOTION_ASSETS[
            requested_name
        ]

        generation = state.get(
            "generation",
            0,
        )

        playback_fps = state.get(
            "playbackFps",
            default_fps,
        )

        if (
            isinstance(playback_fps, bool)
            or not isinstance(
                playback_fps,
                (int, float),
            )
            or playback_fps <= 0
        ):
            playback_fps = (
                default_fps
            )

        frame_subset = (
            self._normalize_subset(
                state.get(
                    "frameSubset"
                ),
                frame_count,
            )
        )

        repeat_mode = state.get(
            "repeatMode"
        )

        if repeat_mode not in (
            "once",
            "loop",
            "count",
            "ping_pong",
        ):
            repeat_mode = (
                default_repeat_mode
            )

        repeat_count = state.get(
            "repeatCount"
        )

        if (
            isinstance(repeat_count, bool)
            or not isinstance(
                repeat_count,
                int,
            )
            or repeat_count <= 0
        ):
            repeat_count = None

        status = state.get(
            "status",
            "playing",
        )

        state_signature = (
            requested_name,
            generation,
            float(playback_fps),
            frame_subset,
            repeat_mode,
            repeat_count,
            status,
        )

        if (
            state_signature
            == self._last_state_signature
        ):
            return False

        emotion_changed = (
            requested_name
            != self._active_name
        )

        if (
            emotion_changed
            or not self._frames
        ):
            loaded = (
                self._load_frames(
                    requested_name,
                    frame_count,
                )
            )

            if not loaded:
                return False

        self._active_name = (
            requested_name
        )

        self._generation = (
            generation
        )

        self._sequence = (
            frame_subset
        )

        self._sequence_position = 0
        self._direction = 1

        self._playback_fps = float(
            playback_fps
        )

        self._frame_delay_ms = max(
            1,
            int(
                1000
                / self._playback_fps
            ),
        )

        self._repeat_mode = (
            repeat_mode
        )

        self._repeat_count = (
            repeat_count
        )

        self._completed_cycles = 0

        # Idle is visually animated even though its
        # logical Emotion status is "idle".
        self._playing = (
            len(self._sequence) > 1
            and (
                requested_name == "idle"
                or status != "finished"
            )
        )

        self._last_frame_ms = (
            time.ticks_ms()
        )

        self._last_state_signature = (
            state_signature
        )

        self._show_current_frame()

        print(
            "Display state:",
            self._active_name,
            "generation:",
            self._generation,
            "fps:",
            self._playback_fps,
            "repeat:",
            self._repeat_mode,
        )

        return True


    def _advance_ping_pong(self):
        if len(self._sequence) <= 1:
            self._playing = False
            return False

        self._sequence_position += (
            self._direction
        )

        if (
            self._sequence_position
            >= len(self._sequence) - 1
        ):
            self._sequence_position = (
                len(self._sequence) - 1
            )

            self._direction = -1

        elif (
            self._sequence_position <= 0
        ):
            self._sequence_position = 0
            self._direction = 1

            self._completed_cycles += 1

        return True


    def _advance_forward(self):
        next_position = (
            self._sequence_position + 1
        )

        if next_position < len(
            self._sequence
        ):
            self._sequence_position = (
                next_position
            )

            return True

        self._completed_cycles += 1

        if self._repeat_mode == "once":
            self._playing = False
            return False

        if (
            self._repeat_mode == "count"
            and self._repeat_count
            is not None
            and self._completed_cycles
            >= self._repeat_count
        ):
            self._playing = False
            return False

        self._sequence_position = 0

        return True


    def update(self):
        """
        Advances the display animation without blocking.

        Call this repeatedly from the robot's main loop.
        """

        if (
            not self._playing
            or len(self._sequence) <= 1
            or not self._frames
        ):
            return False

        now = time.ticks_ms()

        elapsed_ms = (
            time.ticks_diff(
                now,
                self._last_frame_ms,
            )
        )

        if (
            elapsed_ms
            < self._frame_delay_ms
        ):
            return False

        self._last_frame_ms = now

        if (
            self._repeat_mode
            == "ping_pong"
        ):
            advanced = (
                self._advance_ping_pong()
            )
        else:
            advanced = (
                self._advance_forward()
            )

        if not advanced:
            return False

        return (
            self._show_current_frame()
        )


    def restart(self):
        if not self._frames:
            return False

        self._sequence_position = 0
        self._direction = 1
        self._completed_cycles = 0

        self._playing = (
            len(self._sequence) > 1
        )

        self._last_frame_ms = (
            time.ticks_ms()
        )

        return (
            self._show_current_frame()
        )


    def stop(self):
        self._playing = False


    def close(self):
        self.stop()
        self._release_frames()

        self._active_name = None
        self._generation = -1
        self._last_state_signature = None


    def get_active_emotion(self):
        return self._active_name


    def is_playing(self):
        return self._playing


    def get_last_error(self):
        return self._last_error