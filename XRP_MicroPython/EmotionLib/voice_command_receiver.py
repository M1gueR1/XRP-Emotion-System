import sys

try:
    import select
except ImportError:
    import uselect as select


class VoiceCommandReceiver:
    """
    Non-blocking voice command receiver.

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

    def __init__(
        self,
        max_buffer_length=120,
    ):
        self._buffer = ""
        self._queue = []
        self._max_buffer_length = (
            max_buffer_length
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

            if char in (
                "\r",
                "\n",
                "\t",
                " ",
            ):
                continue

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

    def poll(self):
        self._read_available()

        if not self._queue:
            return None

        return self._queue.pop(0)

    def has_command(self):
        self._read_available()
        return bool(self._queue)

    def clear(self):
        self._buffer = ""
        self._queue = []
