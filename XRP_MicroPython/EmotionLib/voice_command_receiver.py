import os
import sys

try:
    import ujson as json
except ImportError:
    import json

try:
    import select
except ImportError:
    import uselect as select


class VoiceCommandReceiver:
    """
    Non-blocking voice command receiver.

    Existing legacy tokens remain unchanged:

      V:H -> turn_happy
      V:S -> turn_sad
      V:E -> turn_excited
      V:I -> turn_in_love

      V:R -> turn_right
      V:L -> turn_left
      V:B -> turn_back / move_back

      V:X -> stop
      V:D -> showtime
      V:Z -> go_to_sleep

    Student-created keywords use a newline-delimited packet:

      V2:C:<command_id>:<emotion_id>\n
    """

    TOKEN_MAP = (
        ("V:H", "turn_happy"),
        ("V:S", "turn_sad"),
        ("V:E", "turn_excited"),
        ("V:I", "turn_in_love"),

        ("V:R", "turn_right"),
        ("V:L", "turn_left"),
        ("V:B", "turn_back"),

        ("V:X", "stop"),
        ("V:D", "showtime"),
        ("V:Z", "go_to_sleep"),
        ("V:P", "lets_play"),
    )

    CUSTOM_COMMAND_ID_MIN = 1000
    CUSTOM_COMMAND_ID_MAX = 65535
    EMOTION_ID_MIN = 0
    EMOTION_ID_MAX = 255

    CUSTOM_SHEETS_DIRECTORY = (
        "/emotion_sheets_custom"
    )
    CUSTOM_MANIFEST_PATH = (
        CUSTOM_SHEETS_DIRECTORY
        + "/manifest.json"
    )

    def __init__(
        self,
        max_buffer_length=240,
        activate_emotions=True,
    ):
        self._buffer = ""
        self._queue = []
        self._max_buffer_length = (
            max_buffer_length
        )
        self._activate_emotions = bool(
            activate_emotions
        )

        self.last_custom_command_id = None
        self.last_custom_command_key = None
        self.last_custom_emotion_id = None

        self._display_update_error_reported = (
            False
        )

    def _get_runtime_red_vision_display(self):
        try:
            from .emotion import Emotion

            if Emotion.get_runtime_emotion() is None:
                return None

            from .red_vision_display import (
                RedVisionEmotionDisplay,
            )

            return (
                RedVisionEmotionDisplay
                .get_runtime_display()
            )
        except Exception:
            return None

    def _update_active_emotion_display(self):
        """
        Advance Red Vision from the same loop that reads
        voice commands. This keeps custom voice emotions
        animated without requiring a separate Blockly
        Run emotion block.
        """
        if not self._activate_emotions:
            return False

        display = (
            self._get_runtime_red_vision_display()
        )

        if display is None:
            return False

        try:
            updated = display.update()
            self._display_update_error_reported = (
                False
            )
            return bool(updated)
        except Exception:
            if not self._display_update_error_reported:
                self._print_v2_error(
                    "RED_VISION_UPDATE_FAILED"
                )
                self._display_update_error_reported = (
                    True
                )

            return False

    def _print_v2_error(
        self,
        reason,
    ):
        print(
            "VOICE_V2:STATUS=ERROR:REASON="
            + str(reason)
        )

    def _read_available(self):
        while True:
            try:
                readable, _, _ = select.select(
                    [sys.stdin],
                    [],
                    [],
                    0,
                )
            except Exception:
                return

            if not readable:
                return

            try:
                char = sys.stdin.read(1)
            except Exception:
                return

            if not char:
                return

            self.feed(char)

    def feed(self, data):
        """
        Feed one serial chunk into the parser.

        This public helper also makes partial-message behavior
        testable without a physical serial connection.
        """
        if data is None:
            return

        if not isinstance(data, str):
            try:
                data = data.decode("utf-8")
            except Exception:
                data = str(data)

        for char in data:
            self._buffer += char

            if (
                len(self._buffer)
                > self._max_buffer_length
            ):
                self._buffer = self._buffer[
                    -self._max_buffer_length:
                ]

            self._extract_commands()

    def _extract_commands(self):
        self._extract_complete_lines()
        self._extract_legacy_commands()

    def _extract_complete_lines(self):
        while True:
            newline_index = self._buffer.find(
                "\n"
            )
            carriage_index = self._buffer.find(
                "\r"
            )

            indexes = [
                index
                for index in (
                    newline_index,
                    carriage_index,
                )
                if index >= 0
            ]

            if not indexes:
                return

            delimiter_index = min(indexes)
            line = self._buffer[
                :delimiter_index
            ].strip()
            self._buffer = self._buffer[
                delimiter_index + 1:
            ]

            if not line:
                continue

            if line.startswith("V2:"):
                self._parse_v2_packet(line)

    def _extract_legacy_commands(self):
        while True:
            best_index = -1
            best_token = None
            best_command = None

            for token, command in self.TOKEN_MAP:
                index = self._buffer.find(
                    token
                )

                if index < 0:
                    continue

                if (
                    best_index < 0
                    or index < best_index
                ):
                    best_index = index
                    best_token = token
                    best_command = command

            if best_token is None:
                return

            self._queue.append(
                best_command
            )

            self._buffer = self._buffer[
                best_index + len(best_token):
            ]

    def _parse_v2_packet(self, packet):
        fields = packet.split(":")

        if (
            len(fields) != 4
            or fields[0] != "V2"
            or fields[1] != "C"
        ):
            self._print_v2_error(
                "INVALID_PACKET"
            )
            return

        try:
            command_id = int(fields[2])
            emotion_id = int(fields[3])
        except Exception:
            self._print_v2_error(
                "INVALID_PACKET"
            )
            return

        if (
            command_id
            < self.CUSTOM_COMMAND_ID_MIN
            or command_id
            > self.CUSTOM_COMMAND_ID_MAX
        ):
            self._print_v2_error(
                "INVALID_COMMAND_ID"
            )
            return

        if (
            emotion_id < self.EMOTION_ID_MIN
            or emotion_id > self.EMOTION_ID_MAX
        ):
            self._print_v2_error(
                "INVALID_EMOTION_ID"
            )
            return

        command_key = (
            "custom:" + str(command_id)
        )

        self.last_custom_command_id = (
            command_id
        )
        self.last_custom_command_key = (
            command_key
        )
        self.last_custom_emotion_id = (
            emotion_id
        )

        self._queue.append(command_key)

        if self._activate_emotions:
            self._activate_emotion_by_id(
                emotion_id
            )

    def _custom_manifest_entry_by_id(
        self,
        emotion_id,
    ):
        try:
            with open(
                self.CUSTOM_MANIFEST_PATH,
                "r",
            ) as manifest_file:
                manifest = json.loads(
                    manifest_file.read()
                )
        except Exception:
            return None, None, (
                "UNKNOWN_EMOTION_ID:"
                + str(emotion_id)
            )

        if not isinstance(manifest, dict):
            return None, None, (
                "UNKNOWN_EMOTION_ID:"
                + str(emotion_id)
            )

        matches = []

        for emotion_name, entry in (
            manifest.items()
        ):
            if not isinstance(entry, dict):
                continue

            if entry.get("emotion_id") == emotion_id:
                matches.append(
                    (emotion_name, entry)
                )

        if len(matches) > 1:
            return None, None, (
                "DUPLICATE_EMOTION_ID:"
                + str(emotion_id)
            )

        if not matches:
            return None, None, (
                "UNKNOWN_EMOTION_ID:"
                + str(emotion_id)
            )

        emotion_name, entry = matches[0]
        asset_path = (
            self.CUSTOM_SHEETS_DIRECTORY
            + "/"
            + emotion_name
            + ".png"
        )

        try:
            if os.stat(asset_path)[6] <= 0:
                raise OSError()
        except OSError:
            return None, None, (
                "UNKNOWN_EMOTION_ID:"
                + str(emotion_id)
            )

        return emotion_name, entry, None

    def _activate_emotion_by_id(
        self,
        emotion_id,
    ):
        try:
            from .emotion import Emotion
            from .emotion_definition import (
                EmotionDefinition,
            )
        except Exception:
            self._print_v2_error(
                "NO_EMOTION_RUNTIME"
            )
            return False

        emotion = Emotion.get_runtime_emotion()

        if emotion is None:
            self._print_v2_error(
                "NO_EMOTION_RUNTIME"
            )
            return False

        emotion_name = (
            emotion.get_emotion_name_by_id(
                emotion_id
            )
        )

        if emotion_id >= 128:
            (
                manifest_name,
                manifest_entry,
                manifest_error,
            ) = self._custom_manifest_entry_by_id(
                emotion_id
            )

            if manifest_error is not None:
                self._print_v2_error(
                    manifest_error
                )
                return False

            if (
                emotion_name is not None
                and emotion_name != manifest_name
            ):
                self._print_v2_error(
                    "EMOTION_ID_MISMATCH:"
                    + str(emotion_id)
                )
                return False

            emotion_name = manifest_name

            if (
                emotion.get_emotion_name_by_id(
                    emotion_id
                )
                is None
            ):
                repeat_mode = (
                    manifest_entry.get(
                        "repeat_mode",
                        "loop",
                    )
                )

                if repeat_mode not in (
                    "once",
                    "loop",
                    "count",
                    "ping_pong",
                ):
                    repeat_mode = "loop"

                repeat_count = (
                    manifest_entry.get(
                        "repeat_count"
                    )
                )

                if (
                    repeat_mode == "count"
                    and (
                        isinstance(
                            repeat_count,
                            bool,
                        )
                        or not isinstance(
                            repeat_count,
                            int,
                        )
                        or repeat_count <= 0
                    )
                ):
                    repeat_count = 1

                if repeat_mode != "count":
                    repeat_count = None

                emotion.register_definition(
                    EmotionDefinition(
                        name=emotion_name,
                        emotion_id=emotion_id,
                        playback_fps=(
                            manifest_entry.get(
                                "default_fps",
                                4,
                            )
                        ),
                        repeat_mode=repeat_mode,
                        repeat_count=(
                            repeat_count
                        ),
                        flag_overrides=(
                            "dashboard_screen",
                        ),
                    )
                )

        if emotion_name is None:
            self._print_v2_error(
                "UNKNOWN_EMOTION_ID:"
                + str(emotion_id)
            )
            return False

        try:
            emotion.set_emotion(
                emotion_name,
                force_reset=True,
            )
            emotion.run_emotion()
        except Exception:
            self._print_v2_error(
                "EMOTION_ACTIVATION_FAILED:"
                + str(emotion_id)
            )
            return False

        print(
            "VOICE_V2:STATUS=OK:COMMAND="
            + str(self.last_custom_command_id)
            + ":EMOTION="
            + str(emotion_id)
        )
        return True

    def poll(self):
        self._read_available()

        self._update_active_emotion_display()

        if not self._queue:
            return None

        return self._queue.pop(0)

    def has_command(self):
        self._read_available()
        return bool(self._queue)

    def clear(self):
        self._buffer = ""
        self._queue = []
        self.last_custom_command_id = None
        self.last_custom_command_key = None
        self.last_custom_emotion_id = None
