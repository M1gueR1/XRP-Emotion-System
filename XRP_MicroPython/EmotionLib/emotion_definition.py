class EmotionDefinition:
    """
    Declarative definition of one emotion.

    None means "use the framework or XRPWeb default" for
    optional visual and timing parameters.
    """

    REPEAT_MODES = (
        "once",
        "loop",
        "count",
        "ping_pong",
    )

    OVERRIDE_FLAGS = (
        "drivetrain",
        "left_drive_motor",
        "right_drive_motor",
        "motor_3",
        "motor_4",
        "servo_1",
        "servo_2",
        "led",
        "onboard_screen",
        "dashboard_screen",
        "speaker",
    )

    OVERRIDE_BITS = {
        "drivetrain": 1,
        "left_drive_motor": 2,
        "right_drive_motor": 4,
        "motor_3": 8,
        "motor_4": 16,
        "servo_1": 32,
        "servo_2": 64,
        "led": 128,
        "onboard_screen": 256,
        "dashboard_screen": 512,
        "speaker": 1024,
    }

    def __init__(
        self,
        name,
        emotion_id,
        playback_fps=None,
        frame_subset=None,
        min_time_before_switch_ms=None,
        repeat_mode=None,
        repeat_count=None,
        flag_overrides=None,
        motion_steps=None,
        motion_repeat=None,
        required_inputs=None,
        allow_drive_override=None,
    ):
        self.name = self._validate_name(name)

        self.emotion_id = self._validate_emotion_id(
            emotion_id
        )

        self.playback_fps = (
            self._validate_optional_fps(
                playback_fps
            )
        )

        self.frame_subset = (
            self._validate_frame_subset(
                frame_subset
            )
        )

        self.min_time_before_switch_ms = (
            self._validate_optional_non_negative_int(
                "min_time_before_switch_ms",
                min_time_before_switch_ms,
            )
        )

        self.repeat_mode = (
            self._validate_repeat_mode(
                repeat_mode
            )
        )

        self.repeat_count = (
            self._validate_repeat_count(
                self.repeat_mode,
                repeat_count,
            )
        )

        if allow_drive_override is not None:
            if not isinstance(
                allow_drive_override,
                bool,
            ):
                raise TypeError(
                    "allow_drive_override "
                    "must be a boolean or None"
                )

            if flag_overrides is not None:
                raise ValueError(
                    "Use flag_overrides or "
                    "allow_drive_override, not both"
                )

            if allow_drive_override:
                flag_overrides = (
                    "drivetrain",
                )
            else:
                flag_overrides = ()

        self.flag_overrides = (
            self._validate_flag_overrides(
                flag_overrides
            )
        )

        self.motion_steps = (
            self._validate_motion_steps(
                motion_steps
            )
        )

        self.motion_repeat = (
            self._validate_optional_bool(
                "motion_repeat",
                motion_repeat,
            )
        )

        self.required_inputs = (
            self._validate_required_inputs(
                required_inputs
            )
        )

        if (
            self.motion_steps
            and not self.allows_override(
                "drivetrain"
            )
        ):
            raise ValueError(
                "motion_steps require the "
                "'drivetrain' override flag"
            )

    @staticmethod
    def _validate_name(name):
        if not isinstance(name, str):
            raise TypeError(
                "name must be a string"
            )

        clean_name = name.strip().lower()

        if not clean_name:
            raise ValueError(
                "name cannot be empty"
            )

        return clean_name

    @staticmethod
    def _validate_non_negative_int(
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

        if value < 0:
            raise ValueError(
                name + " cannot be negative"
            )

        return value

    @classmethod
    def _validate_optional_non_negative_int(
        cls,
        name,
        value,
    ):
        if value is None:
            return None

        return cls._validate_non_negative_int(
            name,
            value,
        )

    @classmethod
    def _validate_emotion_id(
        cls,
        emotion_id,
    ):
        emotion_id = (
            cls._validate_non_negative_int(
                "emotion_id",
                emotion_id,
            )
        )

        if emotion_id > 255:
            raise ValueError(
                "emotion_id must be between "
                "0 and 255"
            )

        return emotion_id

    @staticmethod
    def _validate_optional_fps(value):
        if value is None:
            return None

        if (
            isinstance(value, bool)
            or not isinstance(
                value,
                (int, float),
            )
        ):
            raise TypeError(
                "playback_fps must be a "
                "number or None"
            )

        value = float(value)

        if value < 0:
            raise ValueError(
                "playback_fps cannot be negative"
            )

        return value

    @staticmethod
    def _validate_optional_bool(
        name,
        value,
    ):
        if value is None:
            return None

        if not isinstance(value, bool):
            raise TypeError(
                name + " must be a "
                "boolean or None"
            )

        return value

    @classmethod
    def _validate_frame_subset(
        cls,
        frame_subset,
    ):
        if frame_subset is None:
            return None

        if not isinstance(
            frame_subset,
            (list, tuple),
        ):
            raise TypeError(
                "frame_subset must be a "
                "list, tuple or None"
            )

        if len(frame_subset) == 0:
            raise ValueError(
                "frame_subset cannot be empty"
            )

        parsed = []

        for frame_index in frame_subset:
            parsed.append(
                cls._validate_non_negative_int(
                    "frame index",
                    frame_index,
                )
            )

        return tuple(parsed)

    @classmethod
    def _validate_repeat_mode(
        cls,
        repeat_mode,
    ):
        if repeat_mode is None:
            return None

        if not isinstance(
            repeat_mode,
            str,
        ):
            raise TypeError(
                "repeat_mode must be a "
                "string or None"
            )

        clean_mode = (
            repeat_mode
            .strip()
            .lower()
        )

        if clean_mode not in cls.REPEAT_MODES:
            raise ValueError(
                "repeat_mode must be one of: "
                + ", ".join(
                    cls.REPEAT_MODES
                )
            )

        return clean_mode

    @classmethod
    def _validate_repeat_count(
        cls,
        repeat_mode,
        repeat_count,
    ):
        if repeat_count is not None:
            repeat_count = (
                cls._validate_non_negative_int(
                    "repeat_count",
                    repeat_count,
                )
            )

            if repeat_count == 0:
                raise ValueError(
                    "repeat_count must be "
                    "greater than zero"
                )

        if repeat_mode is None:
            if repeat_count is not None:
                raise ValueError(
                    "repeat_count requires "
                    "repeat_mode"
                )

            return None

        if repeat_mode == "count":
            if repeat_count is None:
                raise ValueError(
                    "repeat_mode 'count' requires "
                    "repeat_count"
                )

            return repeat_count

        if repeat_mode == "once":
            if repeat_count not in (
                None,
                1,
            ):
                raise ValueError(
                    "repeat_mode 'once' accepts "
                    "repeat_count 1 or None"
                )

            return 1

        if repeat_count is not None:
            raise ValueError(
                "repeat_count is only valid with "
                "repeat_mode 'count' or 'once'"
            )

        return None

    @classmethod
    def _validate_flag_overrides(
        cls,
        flag_overrides,
    ):
        if flag_overrides is None:
            return ()

        if not isinstance(
            flag_overrides,
            (list, tuple),
        ):
            raise TypeError(
                "flag_overrides must be a "
                "list, tuple or None"
            )

        parsed = []

        for flag in flag_overrides:
            if not isinstance(flag, str):
                raise TypeError(
                    "override flags must "
                    "be strings"
                )

            clean_flag = (
                flag
                .strip()
                .lower()
            )

            if clean_flag not in cls.OVERRIDE_FLAGS:
                raise ValueError(
                    "Unknown override flag: "
                    + clean_flag
                )

            if clean_flag not in parsed:
                parsed.append(clean_flag)

        return tuple(parsed)

    @staticmethod
    def _validate_effort(
        name,
        value,
    ):
        if (
            isinstance(value, bool)
            or not isinstance(
                value,
                (int, float),
            )
        ):
            raise TypeError(
                name + " must be a number"
            )

        value = float(value)

        if value < -1 or value > 1:
            raise ValueError(
                name + " must be between -1 and 1"
            )

        return value

    @classmethod
    def _validate_motion_steps(
        cls,
        motion_steps,
    ):
        if motion_steps is None:
            return ()

        if not isinstance(
            motion_steps,
            (list, tuple),
        ):
            raise TypeError(
                "motion_steps must be a "
                "list, tuple or None"
            )

        parsed_steps = []

        for step in motion_steps:
            if (
                not isinstance(
                    step,
                    (list, tuple),
                )
                or len(step) != 3
            ):
                raise ValueError(
                    "Each motion step must contain "
                    "duration_ms, straight and turn"
                )

            duration_ms = (
                cls._validate_non_negative_int(
                    "duration_ms",
                    step[0],
                )
            )

            if duration_ms == 0:
                raise ValueError(
                    "duration_ms must be "
                    "greater than zero"
                )

            straight = (
                cls._validate_effort(
                    "straight",
                    step[1],
                )
            )

            turn = cls._validate_effort(
                "turn",
                step[2],
            )

            parsed_steps.append((
                duration_ms,
                straight,
                turn,
            ))

        return tuple(parsed_steps)

    @staticmethod
    def _validate_required_inputs(
        required_inputs,
    ):
        if required_inputs is None:
            return ()

        if not isinstance(
            required_inputs,
            (list, tuple),
        ):
            raise TypeError(
                "required_inputs must be a "
                "list, tuple or None"
            )

        parsed = []

        for sensor_name in required_inputs:
            if not isinstance(
                sensor_name,
                str,
            ):
                raise TypeError(
                    "required input names "
                    "must be strings"
                )

            clean_name = (
                sensor_name
                .strip()
                .lower()
            )

            if not clean_name:
                raise ValueError(
                    "required input name "
                    "cannot be empty"
                )

            if clean_name not in parsed:
                parsed.append(clean_name)

        return tuple(parsed)

    @property
    def allow_drive_override(self):
        """
        Compatibility alias for older examples.
        """

        return self.allows_override(
            "drivetrain"
        )

    def allows_override(
        self,
        flag_name,
    ):
        if not isinstance(flag_name, str):
            raise TypeError(
                "flag_name must be a string"
            )

        clean_flag = (
            flag_name
            .strip()
            .lower()
        )

        return (
            clean_flag
            in self.flag_overrides
        )

    def override_mask(self):
        mask = 0

        for flag in self.flag_overrides:
            mask = (
                mask
                | self.OVERRIDE_BITS[flag]
            )

        return mask

    def effective_playback_fps(
        self,
        default_fps=4,
    ):
        if self.playback_fps is None:
            return float(default_fps)

        return self.playback_fps

    def effective_motion_repeat(
        self,
        default_repeat=False,
    ):
        if self.motion_repeat is None:
            return bool(default_repeat)

        return self.motion_repeat

    def to_dict(self):
        return {
            "name": self.name,
            "emotionId":
                self.emotion_id,
            "playbackFps":
                self.playback_fps,
            "frameSubset":
                self.frame_subset,
            "minTimeBeforeSwitchMs":
                self.min_time_before_switch_ms,
            "repeatMode":
                self.repeat_mode,
            "repeatCount":
                self.repeat_count,
            "flagOverrides":
                self.flag_overrides,
            "overrideMask":
                self.override_mask(),
            "allowDriveOverride":
                self.allow_drive_override,
            "motionSteps":
                self.motion_steps,
            "motionRepeat":
                self.motion_repeat,
            "requiredInputs":
                self.required_inputs,
        }
