import struct
import sys


class XPPEmotionPublisher:
    """
    Publishes Emotion state as custom XPP variables.

    Custom variable IDs:
        38 -> emotionId
        39 -> emotionGeneration
        40 -> emotionFps
        41 -> emotionStatus
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
    )

    def __init__(self, writer=None):
        """
        writer must accept one bytes object.

        By default, raw bytes are written to stdout.
        XRPWeb reads XPP packets from the device stream.
        """

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
            else self._write_to_stdout
        )

        self._variables_defined = False

    @staticmethod
    def _write_to_stdout(packet):
        """
        Write binary data without UTF-8 conversion.
        """

        raw_output = getattr(
            sys.stdout,
            "buffer",
            None,
        )

        if raw_output is None:
            raise RuntimeError(
                "Binary stdout is unavailable. "
                "A firmware-specific XPP writer "
                "is required."
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

        # Name length
        payload.append(
            len(name_bytes)
        )

        # Variable name
        payload.extend(name_bytes)

        # Variable type
        payload.append(
            self.VAR_TYPE_INT
        )

        # Reserved byte
        payload.append(0)

        # Variable ID
        payload.append(variable_id)

        return self._build_packet(
            self.XPP_VAR_DEF,
            payload,
        )

    @staticmethod
    def _int32_bytes(value):
        if isinstance(value, bool):
            value = int(value)

        if not isinstance(value, int):
            value = int(value)

        return struct.pack(
            "<i",
            value,
        )

    def _build_state_update(
        self,
        state,
    ):
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
                state["playbackFps"],
            ),
            (
                self.STATUS_VAR,
                state["statusId"],
            ),
        )

        payload = bytearray()

        # Number of variables
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
        """
        Send custom variable definitions once.
        """

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
        """
        Publish the complete emotion state.
        """

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
        """
        Force definitions to be sent again.

        Useful after reconnecting XRPWeb.
        """

        self._variables_defined = False