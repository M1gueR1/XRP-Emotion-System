import time

from .emotion_definition import (
    EmotionDefinition,
)


class Emotion:
    """
    Manages requested emotions, transitions,
    publishing and non-blocking motion.
    """

    _DEFAULT_EMOTION_INSTANCE = None

    STATUS_IDLE = 0
    STATUS_PLAYING = 1
    STATUS_FINISHED = 2

    DEFAULT_PLAYBACK_FPS = 4

    @classmethod
    def get_default_emotion(cls):
        if cls._DEFAULT_EMOTION_INSTANCE is None:
            cls._DEFAULT_EMOTION_INSTANCE = cls()

        return cls._DEFAULT_EMOTION_INSTANCE

    def __init__(
        self,
        publisher=None,
        min_time_before_switch_ms=500,
    ):
        self._publisher = None
        self._motion_controller = None
        self._motion_configs = {}
        self._drive_override_active = False

        self._emotions = {}
        self._definitions = {}

        self._requested_name = "idle"
        self._active_name = "idle"

        self._generation = 0
        self._status = self.STATUS_IDLE

        self._force_reset_requested = False

        self._default_min_switch_ms = (
            self._validate_non_negative_int(
                "min_time_before_switch_ms",
                min_time_before_switch_ms,
            )
        )

        self._last_switch_ms = (
            time.ticks_ms()
        )

        # Official emotion IDs. These values must stay
        # synchronized with XRPWeb's official catalog.
        official_emotions = (
            ("idle", 0, 4),
            ("happy", 1, 6),
            ("chuckled", 2, 7),
            ("excited", 3, 8),
            ("celebration", 4, 8),
            ("amazed", 5, 6),
            ("puzzled", 6, 5),
            ("frustrated", 7, 6),
            ("upset", 8, 5),
            ("sad", 9, 4),
            ("angry", 10, 7),
            ("love_it", 11, 6),
            ("in_love", 12, 5),
            ("delighted", 13, 6),
            ("ready_to_race", 14, 8),
        )

        for (
            emotion_name,
            emotion_id,
            playback_fps,
        ) in official_emotions:
            self.register_definition(
                EmotionDefinition(
                    name=emotion_name,
                    emotion_id=emotion_id,
                    playback_fps=playback_fps,
                    min_time_before_switch_ms=(
                        0
                        if emotion_name == "idle"
                        else None
                    ),
                    repeat_mode="loop",
                    flag_overrides=(
                        "dashboard_screen",
                    ),
                )
            )

        if publisher is not None:
            self.set_publisher(
                publisher
            )

            # Publish the initial Idle state so the
            # dashboard can render immediately.
            self._publish()

    @staticmethod
    def _validate_name(name):
        if not isinstance(name, str):
            raise TypeError(
                "emotion name must be a string"
            )

        clean_name = name.strip().lower()

        if not clean_name:
            raise ValueError(
                "emotion name cannot be empty"
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

    @staticmethod
    def _validate_positive_number(
        name,
        value,
        allow_zero=False,
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

        if allow_zero:
            if value < 0:
                raise ValueError(
                    name + " cannot be negative"
                )
        elif value <= 0:
            raise ValueError(
                name + " must be greater than zero"
            )

        return value

    def register_emotion(
        self,
        name,
        emotion_id,
        playback_fps=4,
        min_time_before_switch_ms=None,
        allow_drive_override=False,
        required_inputs=(),
    ):
        clean_name = self._validate_name(
            name
        )

        emotion_id = (
            self._validate_non_negative_int(
                "emotion_id",
                emotion_id,
            )
        )

        if emotion_id > 255:
            raise ValueError(
                "emotion_id must be between "
                "0 and 255"
            )

        playback_fps = (
            self._validate_positive_number(
                "playback_fps",
                playback_fps,
                allow_zero=True,
            )
        )

        if min_time_before_switch_ms is None:
            min_switch_ms = None
        else:
            min_switch_ms = (
                self._validate_non_negative_int(
                    "min_time_before_switch_ms",
                    min_time_before_switch_ms,
                )
            )

        if not isinstance(
            allow_drive_override,
            bool,
        ):
            raise TypeError(
                "allow_drive_override "
                "must be a boolean"
            )

        for existing_name in self._emotions:
            existing = self._emotions[
                existing_name
            ]

            if (
                existing["emotionId"]
                == emotion_id
                and existing_name
                != clean_name
            ):
                raise ValueError(
                    "emotion_id is already registered"
                )

        flag_overrides = ()

        if allow_drive_override:
            flag_overrides = (
                "drivetrain",
            )

        self._emotions[clean_name] = {
            "emotionId":
                emotion_id,
            "playbackFps":
                playback_fps,
            "frameSubset":
                None,
            "minTimeBeforeSwitchMs":
                min_switch_ms,
            "repeatMode":
                None,
            "repeatCount":
                None,
            "flagOverrides":
                flag_overrides,
            "overrideMask":
                (
                    EmotionDefinition
                    .OVERRIDE_BITS[
                        "drivetrain"
                    ]
                    if allow_drive_override
                    else 0
                ),
            "allowDriveOverride":
                allow_drive_override,
            "requiredInputs":
                tuple(required_inputs),
        }

    def register_definition(
        self,
        definition,
    ):
        if not isinstance(
            definition,
            EmotionDefinition,
        ):
            raise TypeError(
                "definition must be an "
                "EmotionDefinition"
            )

        name = definition.name

        if (
            self._motion_controller
            is not None
            and name in self._definitions
            and hasattr(
                self._motion_controller,
                "remove_script",
            )
        ):
            self._motion_controller.remove_script(
                name
            )

        self._definitions[name] = definition

        self.register_emotion(
            name=definition.name,
            emotion_id=definition.emotion_id,
            playback_fps=(
                definition
                .effective_playback_fps(
                    self.DEFAULT_PLAYBACK_FPS
                )
            ),
            min_time_before_switch_ms=(
                definition
                .min_time_before_switch_ms
            ),
            allow_drive_override=(
                definition
                .allow_drive_override
            ),
            required_inputs=(
                definition.required_inputs
            ),
        )

        config = self._emotions[name]

        config["frameSubset"] = (
            definition.frame_subset
        )
        config["repeatMode"] = (
            definition.repeat_mode
        )
        config["repeatCount"] = (
            definition.repeat_count
        )
        config["flagOverrides"] = (
            definition.flag_overrides
        )
        config["overrideMask"] = (
            definition.override_mask()
        )

        if (
            self._motion_controller
            is not None
            and definition.motion_steps
        ):
            self._motion_controller.register_script(
                definition.name,
                steps=definition.motion_steps,
                repeat=(
                    definition
                    .effective_motion_repeat(
                        False
                    )
                ),
            )

        return definition

    def get_definition(
        self,
        emotion_name,
    ):
        clean_name = self._validate_name(
            emotion_name
        )

        if clean_name not in self._definitions:
            raise ValueError(
                "Unknown emotion: " + clean_name
            )

        return self._definitions[
            clean_name
        ]

    def list_emotions(self):
        return tuple(
            self._definitions.keys()
        )

    def set_publisher(
        self,
        publisher,
    ):
        if (
            publisher is not None
            and not callable(publisher)
        ):
            raise TypeError(
                "publisher must be callable "
                "or None"
            )

        self._publisher = publisher

    def set_motion_controller(
        self,
        motion_controller,
    ):
        if (
            motion_controller is not None
            and not hasattr(
                motion_controller,
                "update",
            )
        ):
            raise TypeError(
                "motion_controller must "
                "provide update()"
            )

        if (
            self._motion_controller
            is not None
            and self._motion_controller
            is not motion_controller
            and hasattr(
                self._motion_controller,
                "stop",
            )
        ):
            self._motion_controller.stop()

        self._motion_controller = (
            motion_controller
        )

        self._drive_override_active = False

        if motion_controller is None:
            return

        for definition in (
            self._definitions.values()
        ):
            if definition.motion_steps:
                motion_controller.register_script(
                    definition.name,
                    steps=(
                        definition.motion_steps
                    ),
                    repeat=(
                        definition
                        .effective_motion_repeat(
                            False
                        )
                    ),
                )
        
        for (
            emotion_name,
            motion_config,
        ) in self._motion_configs.items():
            motion_controller.register_script(
                emotion_name,
                steps=motion_config["steps"],
                repeat=motion_config["repeat"],
            )

    def configure_motion(
        self,
        emotion_name,
        steps,
        repeat=False,
    ):
        """
        Configure a non-blocking motion script for an emotion.

        Each step contains:
            duration_ms
            straight effort
            turn effort

        The emotion must have the drivetrain override flag.
        """

        clean_name = self._validate_name(
            emotion_name
        )

        if clean_name not in self._emotions:
            raise ValueError(
                "Unknown emotion: " + clean_name
            )

        if self._motion_controller is None:
            raise RuntimeError(
                "A motion controller must be "
                "configured before adding motion"
            )

        if not isinstance(repeat, bool):
            raise TypeError(
                "repeat must be a boolean"
            )

        if not isinstance(
            steps,
            (list, tuple),
        ):
            raise TypeError(
                "steps must be a list or tuple"
            )

        if len(steps) == 0:
            raise ValueError(
                "steps cannot be empty"
            )

        config = self._emotions[
            clean_name
        ]

        if not config[
            "allowDriveOverride"
        ]:
            raise ValueError(
                "Emotion '"
                + clean_name
                + "' requires the drivetrain "
                "override flag before motion "
                "can be configured"
            )

        normalized_steps = []

        for step in steps:
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

            normalized_steps.append(
                tuple(step)
            )

        normalized_steps = tuple(
            normalized_steps
        )

        previous = self._motion_configs.get(
            clean_name
        )

        if (
            previous is not None
            and previous["steps"]
            == normalized_steps
            and previous["repeat"]
            == repeat
        ):
            return False

        self._motion_controller.register_script(
            clean_name,
            steps=normalized_steps,
            repeat=repeat,
        )

        self._motion_configs[
            clean_name
        ] = {
            "steps": normalized_steps,
            "repeat": repeat,
        }

        return True
    
    def remove_motion(
        self,
        emotion_name,
    ):
        clean_name = self._validate_name(
            emotion_name
        )

        existed = (
            clean_name
            in self._motion_configs
        )

        if existed:
            del self._motion_configs[
                clean_name
            ]

        if (
            self._motion_controller
            is not None
            and hasattr(
                self._motion_controller,
                "remove_script",
            )
        ):
            self._motion_controller.remove_script(
                clean_name
            )

        return existed

    def set_min_time_before_switch(
        self,
        milliseconds,
    ):
        self._default_min_switch_ms = (
            self._validate_non_negative_int(
                "milliseconds",
                milliseconds,
            )
        )

    def set_drive_override(
        self,
        emotion_name,
        allowed,
    ):
        clean_name = self._validate_name(
            emotion_name
        )

        if clean_name not in self._emotions:
            raise ValueError(
                "Unknown emotion: " + clean_name
            )

        if not isinstance(allowed, bool):
            raise TypeError(
                "allowed must be a boolean"
            )

        config = self._emotions[
            clean_name
        ]

        config[
            "allowDriveOverride"
        ] = allowed

        if allowed:
            flags = list(
                config["flagOverrides"]
            )

            if "drivetrain" not in flags:
                flags.append(
                    "drivetrain"
                )

            config["flagOverrides"] = (
                tuple(flags)
            )
            config["overrideMask"] = (
                config["overrideMask"]
                | EmotionDefinition
                .OVERRIDE_BITS[
                    "drivetrain"
                ]
            )
        else:
            flags = []

            for flag in config[
                "flagOverrides"
            ]:
                if flag != "drivetrain":
                    flags.append(flag)

            config["flagOverrides"] = (
                tuple(flags)
            )
            config["overrideMask"] = (
                config["overrideMask"]
                & ~EmotionDefinition
                .OVERRIDE_BITS[
                    "drivetrain"
                ]
            )

    def set_emotion(
        self,
        name,
        force_reset=False,
    ):
        clean_name = self._validate_name(
            name
        )

        if clean_name not in self._emotions:
            raise ValueError(
                "Unknown emotion: " + clean_name
            )

        if not isinstance(
            force_reset,
            bool,
        ):
            raise TypeError(
                "force_reset must be a boolean"
            )

        self._requested_name = clean_name

        if force_reset:
            self._force_reset_requested = True

    def clear(self):
        self.set_emotion("idle")

    def _active_min_switch_ms(self):
        active_config = self._emotions[
            self._active_name
        ]

        configured_value = active_config[
            "minTimeBeforeSwitchMs"
        ]

        if configured_value is None:
            return self._default_min_switch_ms

        return configured_value

    def _can_switch(self, now):
        if self._active_name == "idle":
            return True

        elapsed = time.ticks_diff(
            now,
            self._last_switch_ms,
        )

        return (
            elapsed
            >= self._active_min_switch_ms()
        )

    def _update_motion(self):
        if self._motion_controller is None:
            self._drive_override_active = False
            return False

        config = self._emotions[
            self._active_name
        ]

        self._drive_override_active = (
            self._motion_controller.update(
                self._active_name,
                self._generation,
                config[
                    "allowDriveOverride"
                ],
            )
        )

        return self._drive_override_active

    def run_emotion(self):
        now = time.ticks_ms()

        same_emotion = (
            self._requested_name
            == self._active_name
        )

        changed = False

        if (
            not same_emotion
            or self._force_reset_requested
        ):
            can_change = (
                same_emotion
                or self._can_switch(now)
            )

            if can_change:
                self.stop_motion()

                self._active_name = (
                    self._requested_name
                )

                self._generation += 1

                if self._active_name == "idle":
                    self._status = (
                        self.STATUS_IDLE
                    )
                else:
                    self._status = (
                        self.STATUS_PLAYING
                    )

                self._last_switch_ms = now
                self._force_reset_requested = False

                self._publish()

                changed = True

        self._update_motion()

        return changed

    def mark_finished(self):
        if self._active_name == "idle":
            return False

        if self._status == self.STATUS_FINISHED:
            return False

        self._status = self.STATUS_FINISHED
        self._publish()

        return True

    def _status_name(self):
        if self._status == self.STATUS_PLAYING:
            return "playing"

        if self._status == self.STATUS_FINISHED:
            return "finished"

        return "idle"

    def get_state(self):
        config = self._emotions[
            self._active_name
        ]

        return {
            "emotionId":
                config["emotionId"],
            "emotionName":
                self._active_name,
            "generation":
                self._generation,
            "playbackFps":
                config["playbackFps"],
            "frameSubset":
                config["frameSubset"],
            "repeatMode":
                config["repeatMode"],
            "repeatCount":
                config["repeatCount"],
            "flagOverrides":
                config["flagOverrides"],
            "overrideMask":
                config["overrideMask"],
            "status":
                self._status_name(),
            "statusId":
                self._status,
            "allowDriveOverride":
                config[
                    "allowDriveOverride"
                ],
            "requiredInputs":
                config["requiredInputs"],
        }

    def _publish(self):
        if self._publisher is None:
            return

        self._publisher(
            self.get_state()
        )

    def stop_motion(self):
        if self._motion_controller is not None:
            self._motion_controller.stop()

        self._drive_override_active = False

    def is_overriding_drive(self):
        return self._drive_override_active

    def get_active_emotion(self):
        return self._active_name

    def get_requested_emotion(self):
        return self._requested_name

    def get_generation(self):
        return self._generation

    def is_active(self, name):
        clean_name = self._validate_name(
            name
        )

        return (
            self._active_name
            == clean_name
        )
