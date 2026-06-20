import gc
import os
import sys
import time

cv = None
np = None


def _load_red_vision_dependencies():
    """
    Load OpenCV, ulab and the physical display only
    when Red Vision is actually enabled.
    """
    global cv
    global np

    if cv is None:
        import cv2 as cv_module
        cv = cv_module

    if np is None:
        from ulab import numpy as np_module
        np = np_module

    try:
        from rv_init import (
            display as default_display,
        )

    except ImportError:
        red_vision_examples_path = (
            "/red_vision_examples"
        )

        if (
            red_vision_examples_path
            not in sys.path
        ):
            sys.path.append(
                red_vision_examples_path
            )

        from rv_init import (
            display as default_display,
        )

    return default_display



# --------------------------------------------------
# Display geometry
# --------------------------------------------------

DISPLAY_WIDTH = 320
DISPLAY_HEIGHT = 240

FRAME_WIDTH = 192
FRAME_HEIGHT = 192

FRAME_OFFSET_X = (
    DISPLAY_WIDTH - FRAME_WIDTH
) // 2

FRAME_OFFSET_Y = (
    DISPLAY_HEIGHT - FRAME_HEIGHT
) // 2


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

    The 192x192 animation sheets are stored
    locally on the XRP:

        /emotion_sheets_192/happy.png
        /emotion_sheets_192/frustrated.png
        ...

    A reusable 320x240 black canvas centers the
    active face on the physical display. The class
    can cache a small number of decoded emotion
    sheets for instant transitions.

    When enabled=False, or when the display cannot
    initialize and strict_display=False, all display
    operations safely become no-ops.
    """

    def __init__(
        self,
        display=None,
        sheets_directory=(
            "/emotion_sheets_192"
        ),
        strict_assets=False,
        cache_capacity=3,
        debug=False,
        enabled=True,
        strict_display=False,
    ):
        if not isinstance(
            enabled,
            bool,
        ):
            raise TypeError(
                "enabled must be a boolean"
            )

        if not isinstance(
            strict_display,
            bool,
        ):
            raise TypeError(
                "strict_display must be a boolean"
            )

        self._enabled = False
        self._display = None
        self._display_frame = None

        self._sheets_directory = (
            sheets_directory.rstrip("/")
        )

        self._strict_assets = (
            strict_assets
        )

        if not isinstance(
            debug,
            bool,
        ):
            raise TypeError(
                "debug must be a boolean"
            )

        self._debug = debug

        if (
            isinstance(cache_capacity, bool)
            or not isinstance(
                cache_capacity,
                int,
            )
            or cache_capacity < 1
        ):
            raise ValueError(
                "cache_capacity must be "
                "an integer greater than zero"
            )

        self._cache_capacity = (
            cache_capacity
        )

        self._sheet_cache = {}
        self._cache_order = []

        self._sheet_name = None

        self._active_name = None
        self._generation = -1

        self._sheet = None
        self._sheet_frame_count = 0
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

        if enabled:
            try:
                default_display = (
                    _load_red_vision_dependencies()
                )

                self._display = (
                    default_display
                    if display is None
                    else display
                )

                self._display_frame = (
                    np.zeros(
                        (
                            DISPLAY_HEIGHT,
                            DISPLAY_WIDTH,
                            3,
                        ),
                        dtype=np.uint8,
                    )
                )

                self._enabled = True

            except Exception as error:
                self._last_error = (
                    "Red Vision display unavailable: "
                    + str(error)
                )

                if strict_display:
                    raise

                self._log(
                    self._last_error
                )


    def _log(
        self,
        *values,
    ):
        if self._debug:
            print(*values)


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


    def _sheet_path(
        self,
        emotion_name,
    ):
        return (
            self._sheets_directory
            + "/"
            + emotion_name
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


    def _touch_cache(
        self,
        emotion_name,
    ):
        if emotion_name in (
            self._cache_order
        ):
            self._cache_order.remove(
                emotion_name
            )

        self._cache_order.append(
            emotion_name
        )


    def _evict_cache_if_needed(
        self,
    ):
        while (
            len(self._sheet_cache)
            > self._cache_capacity
        ):
            emotion_to_remove = None

            for emotion_name in tuple(
                self._cache_order
            ):
                if (
                    emotion_name
                    != self._sheet_name
                ):
                    emotion_to_remove = (
                        emotion_name
                    )
                    break

            if emotion_to_remove is None:
                return

            self._cache_order.remove(
                emotion_to_remove
            )

            del self._sheet_cache[
                emotion_to_remove
            ]

            self._log(
                "Display cache evicted:",
                emotion_to_remove,
            )

            gc.collect()


    def _read_sheet(
        self,
        emotion_name,
        frame_count,
    ):
        sheet_path = (
            self._sheet_path(
                emotion_name
            )
        )

        if not self._asset_exists(
            sheet_path
        ):
            message = (
                "Missing display sheet: "
                + sheet_path
            )

            self._last_error = message

            if self._strict_assets:
                raise OSError(
                    message
                )

            print(message)
            return None

        self._log(
            "Decoding display sheet:",
            emotion_name,
        )

        sheet = cv.imread(
            sheet_path
        )

        if sheet is None:
            message = (
                "Could not decode display sheet: "
                + sheet_path
            )

            self._last_error = message

            if self._strict_assets:
                raise OSError(
                    message
                )

            print(message)
            return None

        expected_height = (
            frame_count
            * FRAME_HEIGHT
        )

        if (
            sheet.shape[0]
            != expected_height
            or sheet.shape[1]
            != FRAME_WIDTH
        ):
            message = (
                "Invalid display sheet size for "
                + emotion_name
                + ": expected "
                + str(FRAME_WIDTH)
                + "x"
                + str(expected_height)
            )

            self._last_error = message

            del sheet
            gc.collect()

            if self._strict_assets:
                raise ValueError(
                    message
                )

            print(message)
            return None

        self._last_error = None

        return sheet


    def _use_cached_sheet(
        self,
        emotion_name,
    ):
        cached = self._sheet_cache.get(
            emotion_name
        )

        if cached is None:
            return False

        (
            self._sheet,
            self._sheet_frame_count,
        ) = cached

        self._sheet_name = (
            emotion_name
        )

        self._touch_cache(
            emotion_name
        )

        return True


    def _load_sheet(
        self,
        emotion_name,
        frame_count,
    ):
        if self._use_cached_sheet(
            emotion_name
        ):
            self._log(
                "Display cache hit:",
                emotion_name,
            )

            return True

        sheet = self._read_sheet(
            emotion_name,
            frame_count,
        )

        if sheet is None:
            return False

        self._sheet_cache[
            emotion_name
        ] = (
            sheet,
            frame_count,
        )

        self._touch_cache(
            emotion_name
        )

        self._sheet = sheet
        self._sheet_frame_count = (
            frame_count
        )
        self._sheet_name = (
            emotion_name
        )

        self._evict_cache_if_needed()

        self._log(
            "Display sheet cached:",
            emotion_name,
            frame_count,
            "frames",
        )

        return True


    def preload(
        self,
        emotion_names,
    ):
        if not self._enabled:
            return ()

        """
        Decode selected emotions before the robot
        starts moving.

        The number retained is limited by
        cache_capacity.
        """

        if isinstance(
            emotion_names,
            str,
        ):
            emotion_names = (
                emotion_names,
            )

        loaded_names = []

        for raw_name in emotion_names:
            emotion_name = (
                self._clean_name(
                    raw_name
                )
            )

            if (
                emotion_name
                not in OFFICIAL_EMOTION_ASSETS
            ):
                message = (
                    "Unknown display emotion: "
                    + emotion_name
                )

                if self._strict_assets:
                    raise ValueError(
                        message
                    )

                print(message)
                continue

            if emotion_name in (
                self._sheet_cache
            ):
                self._touch_cache(
                    emotion_name
                )

                loaded_names.append(
                    emotion_name
                )

                continue

            frame_count = (
                OFFICIAL_EMOTION_ASSETS[
                    emotion_name
                ][0]
            )

            sheet = self._read_sheet(
                emotion_name,
                frame_count,
            )

            if sheet is None:
                continue

            self._sheet_cache[
                emotion_name
            ] = (
                sheet,
                frame_count,
            )

            self._touch_cache(
                emotion_name
            )

            self._evict_cache_if_needed()

            loaded_names.append(
                emotion_name
            )

            self._log(
                "Display preloaded:",
                emotion_name,
            )

        gc.collect()

        self._log(
            "Display cache ready:",
            tuple(
                self._cache_order
            ),
        )

        return tuple(
            loaded_names
        )


    def clear_cache(
        self,
        keep_active=True,
    ):
        if not self._enabled:
            return False

        if (
            keep_active
            and self._sheet is not None
            and self._sheet_name is not None
        ):
            active_name = (
                self._sheet_name
            )

            active_entry = (
                self._sheet,
                self._sheet_frame_count,
            )

            self._sheet_cache = {
                active_name: active_entry,
            }

            self._cache_order = [
                active_name,
            ]

        else:
            self._sheet_cache = {}
            self._cache_order = []

            self._sheet = None
            self._sheet_frame_count = 0
            self._sheet_name = None

        gc.collect()


    def get_cached_emotions(self):
        if not self._enabled:
            return ()

        return tuple(
            self._cache_order
        )


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
            not self._enabled
            or self._sheet is None
            or not self._sequence
        ):
            return False

        frame_index = (
            self._sequence[
                self._sequence_position
            ]
        )

        row_start = (
            frame_index
            * FRAME_HEIGHT
        )

        row_end = (
            row_start
            + FRAME_HEIGHT
        )

        frame = self._sheet[
            row_start:row_end,
            :
        ]

        display_row_end = (
            FRAME_OFFSET_Y
            + FRAME_HEIGHT
        )

        display_column_end = (
            FRAME_OFFSET_X
            + FRAME_WIDTH
        )

        # Replace only the centered face region.
        # The surrounding pixels remain black.
        self._display_frame[
            FRAME_OFFSET_Y:
            display_row_end,
            FRAME_OFFSET_X:
            display_column_end,
        ] = frame

        cv.imshow(
            self._display,
            self._display_frame,
        )

        return True


    def apply_state(
        self,
        state,
    ):
        if not self._enabled:
            return False

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
            or self._sheet is None
        ):
            loaded = (
                self._load_sheet(
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

        self._log(
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
        if not self._enabled:
            return False

        """
        Advances the display animation without blocking.

        Call this repeatedly from the robot's main loop.
        """

        if (
            not self._playing
            or len(self._sequence) <= 1
            or self._sheet is None
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
        if (
            not self._enabled
            or self._sheet is None
        ):
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


    def is_enabled(self):
        return self._enabled


    def disable(self):
        self.stop()

        self._sheet = None
        self._sheet_frame_count = 0
        self._sheet_name = None
        self._sheet_cache = {}
        self._cache_order = []

        self._enabled = False
        self._display = None
        self._display_frame = None

        gc.collect()


    def stop(self):
        self._playing = False


    def close(self):
        self.stop()

        self._enabled = False
        self._display = None

        self._sheet = None
        self._sheet_frame_count = 0
        self._sheet_name = None

        self._sheet_cache = {}
        self._cache_order = []

        self._display_frame = None

        self._active_name = None
        self._generation = -1
        self._last_state_signature = None

        gc.collect()


    def get_active_emotion(self):
        return self._active_name


    def is_playing(self):
        return self._playing


    def get_last_error(self):
        return self._last_error