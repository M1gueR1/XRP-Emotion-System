import struct
import sys


class XPPEmotionPublisher:
    """
    Publishes Emotion state as custom XPP variables.

    Variable IDs:
        38 -> emotionId
        39 -> emotionGeneration
        40 -> emotionFps
        41 -> emotionStatus
        42 -> emotionFlags
        43 -> emotionRepeatMode
        44 -> emotionRepeatCount
        45 -> emotionFrameSubsetLength
        46 -> emotionFrameSubsetPacked

    Frame subsets are packed using four bits per frame.
    This preserves order and repeated frames.

    Current transport limits:
        maximum 8 frames in the sequence
        frame indexes from 0 to 15
    """

    XPP_START = b"\xAA\x55"
    XPP_END = b"\x55\xAA"

    XPP_VAR_DEF = 1
    XPP_VAR_UPDATE = 2

    VAR_TYPE_INT = 1

    EMOTION_ID_VAR = 38
    GENERATION_VAR = 39
    FPS_VAR = 40
    STATUS_VAR = 41
    FLAGS_VAR = 42
    REPEAT_MODE_VAR = 43
    REPEAT_COUNT_VAR = 44
    FRAME_SUBSET_LENGTH_VAR = 45
    FRAME_SUBSET_PACKED_VAR = 46

    REPEAT_MODE_IDS = {
        None: 0,
        "once": 1,
        "loop": 2,
        "count": 3,
        "ping_pong": 4,
    }

    VARIABLES = (
        (
            "emotionId",
            EMOTION_ID_VAR,
        ),
        (
            "emotionGeneration",
            GENERATION_VAR,
        ),
        (
            "emotionFps",
            FPS_VAR,
        ),
        (
            "emotionStatus",
            STATUS_VAR,
        ),
        (
            "emotionFlags",
            FLAGS_VAR,
        ),
        (
            "emotionRepeatMode",
            REPEAT_MODE_VAR,
        ),
        (
            "emotionRepeatCount",
            REPEAT_COUNT_VAR,
        ),
        (
            "emotionFrameSubsetLength",
            FRAME_SUBSET_LENGTH_VAR,
        ),
        (
            "emotionFrameSubsetPacked",
            FRAME_SUBSET_PACKED_VAR,
        ),
    )

    def __init__(self, writer=None):
        if (
            writer is not None
            and not callable(writer)
        ):
            raise TypeError(
                "writer must be callable or None"
            )

        self._writer = (
            writer
            if writer is not None
            else self._write_to_transport
        )

        self._variables_defined = False

    @staticmethod
    def _write_to_transport(packet):
        """
        Send XPP through the correct active transport.

        Bluetooth:
            use the dedicated binary DATA characteristic.

        USB:
            use the binary stdout stream, where XRPWeb
            extracts XPP packets from the serial stream.
        """

        # Do not import ble.blerepl here because importing it
        # would start Bluetooth even during a USB session.
        ble_module = sys.modules.get(
            "ble.blerepl"
        )

        if ble_module is not None:
            uart = getattr(
                ble_module,
                "uart",
                None,
            )

            if uart is not None:
                connections = getattr(
                    uart,
                    "_connections",
                    None,
                )

                if connections:
                    write_data = getattr(
                        uart,
                        "write_data",
                        None,
                    )

                    if callable(write_data):
                        write_data(packet)
                        return len(packet)

        # No active Bluetooth connection:
        # use the USB binary output stream.
        raw_output = getattr(
            sys.stdout,
            "buffer",
            None,
        )

        if raw_output is None:
            raise RuntimeError(
                "No compatible XPP transport "
                "is currently available."
            )

        return raw_output.write(packet)

    @staticmethod
    def _validate_byte(
        name,
        value,
    ):
        if (
            isinstance(value, bool)
            or not isinstance(value, int)
        ):
            raise TypeError(
                name + " must be an integer"
            )

        if value < 0 or value > 255:
            raise ValueError(
                name + " must be between 0 and 255"
            )

        return value

    def _build_packet(
        self,
        message_type,
        payload,
    ):
        message_type = self._validate_byte(
            "message_type",
            message_type,
        )

        if not isinstance(
            payload,
            (bytes, bytearray),
        ):
            raise TypeError(
                "payload must be bytes or bytearray"
            )

        payload_length = len(payload)

        if payload_length > 255:
            raise ValueError(
                "XPP payload cannot exceed 255 bytes"
            )

        packet = bytearray()

        packet.extend(self.XPP_START)
        packet.append(message_type)
        packet.append(payload_length)
        packet.extend(payload)
        packet.extend(self.XPP_END)

        return bytes(packet)

    def _build_variable_definition(
        self,
        variable_name,
        variable_id,
    ):
        if not isinstance(
            variable_name,
            str,
        ):
            raise TypeError(
                "variable_name must be a string"
            )

        name_bytes = variable_name.encode(
            "ascii"
        )

        if len(name_bytes) > 255:
            raise ValueError(
                "variable_name is too long"
            )

        variable_id = self._validate_byte(
            "variable_id",
            variable_id,
        )

        payload = bytearray()

        payload.append(
            len(name_bytes)
        )
        payload.extend(name_bytes)
        payload.append(
            self.VAR_TYPE_INT
        )
        payload.append(0)
        payload.append(variable_id)

        return self._build_packet(
            self.XPP_VAR_DEF,
            payload,
        )

    @staticmethod
    def _to_signed_int32(value):
        value = int(value)

        if value < -2147483648:
            raise ValueError(
                "integer is below int32 range"
            )

        if value > 4294967295:
            raise ValueError(
                "integer is above uint32 range"
            )

        if value > 2147483647:
            value = value - 4294967296

        return value

    @classmethod
    def _int32_bytes(
        cls,
        value,
    ):
        return struct.pack(
            "<i",
            cls._to_signed_int32(value),
        )

    @classmethod
    def _repeat_mode_id(
        cls,
        repeat_mode,
    ):
        if repeat_mode not in cls.REPEAT_MODE_IDS:
            raise ValueError(
                "Unknown repeat mode: "
                + str(repeat_mode)
            )

        return cls.REPEAT_MODE_IDS[
            repeat_mode
        ]

    @staticmethod
    def _pack_frame_subset(
        frame_subset,
    ):
        if frame_subset is None:
            return 0, 0

        if not isinstance(
            frame_subset,
            (list, tuple),
        ):
            raise TypeError(
                "frameSubset must be a "
                "list, tuple or None"
            )

        if len(frame_subset) == 0:
            raise ValueError(
                "frameSubset cannot be empty"
            )

        if len(frame_subset) > 8:
            raise ValueError(
                "XPP frameSubset supports "
                "at most 8 frames"
            )

        packed = 0

        for position, frame_index in enumerate(
            frame_subset
        ):
            if (
                isinstance(frame_index, bool)
                or not isinstance(
                    frame_index,
                    int,
                )
            ):
                raise TypeError(
                    "frame indexes must be integers"
                )

            if (
                frame_index < 0
                or frame_index > 15
            ):
                raise ValueError(
                    "XPP frame indexes must be "
                    "between 0 and 15"
                )

            packed = (
                packed
                | (
                    frame_index
                    << (position * 4)
                )
            )

        return len(frame_subset), packed

    def _build_state_update(
        self,
        state,
    ):
        (
            frame_subset_length,
            frame_subset_packed,
        ) = self._pack_frame_subset(
            state.get("frameSubset")
        )

        repeat_mode_id = (
            self._repeat_mode_id(
                state.get("repeatMode")
            )
        )

        repeat_count = state.get(
            "repeatCount"
        )

        if repeat_count is None:
            repeat_count = -1

        values = (
            (
                self.EMOTION_ID_VAR,
                state["emotionId"],
            ),
            (
                self.GENERATION_VAR,
                state["generation"],
            ),
            (
                self.FPS_VAR,
                round(
                    state["playbackFps"]
                ),
            ),
            (
                self.STATUS_VAR,
                state["statusId"],
            ),
            (
                self.FLAGS_VAR,
                state.get(
                    "overrideMask",
                    0,
                ),
            ),
            (
                self.REPEAT_MODE_VAR,
                repeat_mode_id,
            ),
            (
                self.REPEAT_COUNT_VAR,
                repeat_count,
            ),
            (
                self.FRAME_SUBSET_LENGTH_VAR,
                frame_subset_length,
            ),
            (
                self.FRAME_SUBSET_PACKED_VAR,
                frame_subset_packed,
            ),
        )

        payload = bytearray()

        payload.append(len(values))

        for variable_id, value in values:
            payload.append(variable_id)
            payload.append(
                self.VAR_TYPE_INT
            )
            payload.extend(
                self._int32_bytes(value)
            )

        return self._build_packet(
            self.XPP_VAR_UPDATE,
            payload,
        )

    def define_variables(self):
        if self._variables_defined:
            return False

        for variable_name, variable_id in (
            self.VARIABLES
        ):
            packet = (
                self._build_variable_definition(
                    variable_name,
                    variable_id,
                )
            )

            self._writer(packet)

        self._variables_defined = True

        return True

    def publish_state(self, state):
        if not isinstance(state, dict):
            raise TypeError(
                "state must be a dictionary"
            )

        required_fields = (
            "emotionId",
            "generation",
            "playbackFps",
            "statusId",
        )

        for field in required_fields:
            if field not in state:
                raise ValueError(
                    "Missing emotion state field: "
                    + field
                )

        self.define_variables()

        packet = self._build_state_update(
            state
        )

        self._writer(packet)

        return True

    def reset_definitions(self):
        self._variables_defined = False
