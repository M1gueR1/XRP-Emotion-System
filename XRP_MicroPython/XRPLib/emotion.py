import time


class Emotion:
    """
    Manages the emotion requested by the student program.

    This class does not render sprites. It decides when an
    emotion changes and notifies an external publisher.

    The publisher will later send the emotion through XPP.
    """

    _DEFAULT_EMOTION_INSTANCE = None

    STATUS_IDLE = 0
    STATUS_PLAYING = 1
    STATUS_FINISHED = 2

    @classmethod
    def get_default_emotion(cls):
        """
        Return the default Emotion singleton.
        """

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
        self._drive_override_active = False

        self._emotions = {}

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

        self._last_switch_ms = time.ticks_ms()

        self.register_emotion(
            "idle",
            emotion_id=0,
            playback_fps=0,
            min_time_before_switch_ms=0,
        )

        self.register_emotion(
            "happy",
            emotion_id=1,
            playback_fps=4,
        )

        self.register_emotion(
            "nervous",
            emotion_id=2,
            playback_fps=6,
        )

        self.register_emotion(
            "lost",
            emotion_id=3,
            playback_fps=4,
        )

        if publisher is not None:
            self.set_publisher(publisher)

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
    ):
        """
        Register an emotion known by the robot and dashboard.

        emotion_id must fit in one byte so it can later be
        transmitted efficiently through XPP.
        """

        clean_name = self._validate_name(name)

        emotion_id = self._validate_non_negative_int(
            "emotion_id",
            emotion_id,
        )

        if emotion_id > 255:
            raise ValueError(
                "emotion_id must be between 0 and 255"
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

        for existing_name in self._emotions:
            existing = self._emotions[
                existing_name
            ]

            if (
                existing["emotionId"]
                == emotion_id
                and existing_name != clean_name
            ):
                raise ValueError(
                    "emotion_id is already registered"
                )
                
        if not isinstance(
            allow_drive_override,
            bool,
        ):
            raise TypeError(
                "allow_drive_override "
                "must be a boolean"
            )

        self._emotions[clean_name] = {
            "emotionId": emotion_id,
            "playbackFps": playback_fps,
            "minTimeBeforeSwitchMs":
                min_switch_ms,
            "allowDriveOverride":
                allow_drive_override,
        }

    def set_publisher(self, publisher):
        """
        Set the function called when the emotion changes.

        The function receives one dictionary containing:
        emotionId, generation, playbackFps and status.
        """

        if (
            publisher is not None
            and not callable(publisher)
        ):
            raise TypeError(
                "publisher must be callable or None"
            )

        self._publisher = publisher

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

    def set_emotion(
        self,
        name,
        force_reset=False,
    ):
        """
        Request an emotion.

        This method does not immediately publish the change.
        run_emotion() must be called from the main loop.
        """

        clean_name = self._validate_name(name)

        if clean_name not in self._emotions:
            raise ValueError(
                "Unknown emotion: " + clean_name
            )

        if not isinstance(force_reset, bool):
            raise TypeError(
                "force_reset must be a boolean"
            )

        self._requested_name = clean_name

        if force_reset:
            self._force_reset_requested = True

    def clear(self):
        """
        Request the idle state.
        """

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

    def run_emotion(self):
        """
        Apply pending state changes and update actuators.

        Returns True only when the emotional state changed.
        Motion scripts continue updating on every call.
        """

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
        """
        Mark the current emotion as finished.

        This will later be useful for one-shot animations.
        """

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
            "emotionId": config["emotionId"],
            "emotionName": self._active_name,
            "generation": self._generation,
            "playbackFps":
                config["playbackFps"],
            "status": self._status_name(),
            "statusId": self._status,
        }

    def _publish(self):
        if self._publisher is None:
            return

        self._publisher(
            self.get_state()
        )

    def get_active_emotion(self):
        return self._active_name

    def get_requested_emotion(self):
        return self._requested_name

    def get_generation(self):
        return self._generation

    def is_active(self, name):
        clean_name = self._validate_name(name)

        return (
            self._active_name
            == clean_name
        )
        
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
                "motion_controller must provide update()"
            )

        self._motion_controller = (
            motion_controller
        )

        if motion_controller is None:
            self._drive_override_active = False


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

        self._emotions[clean_name][
            "allowDriveOverride"
        ] = allowed


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
                config["allowDriveOverride"],
            )
        )

        return self._drive_override_active


    def is_overriding_drive(self):
        return self._drive_override_active


    def stop_motion(self):
        if self._motion_controller is not None:
            self._motion_controller.stop()

        self._drive_override_active = False