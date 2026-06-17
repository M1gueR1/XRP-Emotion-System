import time


class EmotionMotionController:
    """
    Runs non-blocking drivetrain motion scripts.

    Each step has:
        duration_ms
        straight effort
        turn effort
    """

    def __init__(self, drivetrain):
        if drivetrain is None:
            raise TypeError(
                "drivetrain cannot be None"
            )

        if not hasattr(drivetrain, "arcade"):
            raise TypeError(
                "drivetrain must provide arcade()"
            )

        if not hasattr(drivetrain, "stop"):
            raise TypeError(
                "drivetrain must provide stop()"
            )

        self._drivetrain = drivetrain
        self._scripts = {}

        self._active_emotion = None
        self._active_generation = None

        self._step_index = 0
        self._step_started_ms = 0

        self._owns_drive = False
        self._finished = False

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
    def _validate_effort(name, value):
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

    @staticmethod
    def _validate_duration(value):
        if (
            isinstance(value, bool)
            or not isinstance(value, int)
        ):
            raise TypeError(
                "duration_ms must be an integer"
            )

        if value <= 0:
            raise ValueError(
                "duration_ms must be greater than zero"
            )

        return value

    def register_script(
        self,
        emotion_name,
        steps,
        repeat=False,
    ):
        clean_name = self._validate_name(
            emotion_name
        )

        if not isinstance(steps, (list, tuple)):
            raise TypeError(
                "steps must be a list or tuple"
            )

        if len(steps) == 0:
            raise ValueError(
                "steps cannot be empty"
            )

        if not isinstance(repeat, bool):
            raise TypeError(
                "repeat must be a boolean"
            )

        parsed_steps = []

        for step in steps:
            if (
                not isinstance(step, (list, tuple))
                or len(step) != 3
            ):
                raise ValueError(
                    "each step must contain "
                    "duration_ms, straight and turn"
                )

            duration_ms = (
                self._validate_duration(
                    step[0]
                )
            )

            straight = self._validate_effort(
                "straight",
                step[1],
            )

            turn = self._validate_effort(
                "turn",
                step[2],
            )

            parsed_steps.append((
                duration_ms,
                straight,
                turn,
            ))

        self._scripts[clean_name] = {
            "steps": tuple(parsed_steps),
            "repeat": repeat,
        }

    def remove_script(
        self,
        emotion_name,
    ):
        clean_name = self._validate_name(
            emotion_name
        )

        if clean_name in self._scripts:
            del self._scripts[clean_name]

        if self._active_emotion == clean_name:
            self.stop()

    def _begin(
        self,
        emotion_name,
        generation,
    ):
        self._active_emotion = emotion_name
        self._active_generation = generation

        self._step_index = 0
        self._step_started_ms = (
            time.ticks_ms()
        )

        self._finished = False

    def _release_drive(self):
        if self._owns_drive:
            self._drivetrain.stop()

        self._owns_drive = False

    def update(
        self,
        emotion_name,
        generation,
        allow_drive_override=False,
    ):
        """
        Advance the current motion script.

        Returns True while the emotion owns the drivetrain.
        """

        clean_name = self._validate_name(
            emotion_name
        )

        if not isinstance(
            allow_drive_override,
            bool,
        ):
            raise TypeError(
                "allow_drive_override "
                "must be a boolean"
            )

        if (
            not allow_drive_override
            or clean_name not in self._scripts
        ):
            self._release_drive()

            self._active_emotion = clean_name
            self._active_generation = generation
            self._finished = False

            return False

        must_restart = (
            clean_name != self._active_emotion
            or generation
            != self._active_generation
        )

        if must_restart:
            self._begin(
                clean_name,
                generation,
            )

        if self._finished:
            self._release_drive()
            return False

        script = self._scripts[
            clean_name
        ]

        steps = script["steps"]

        now = time.ticks_ms()

        (
            duration_ms,
            straight,
            turn,
        ) = steps[self._step_index]

        elapsed = time.ticks_diff(
            now,
            self._step_started_ms,
        )

        if elapsed >= duration_ms:
            self._step_index += 1

            if self._step_index >= len(steps):
                if script["repeat"]:
                    self._step_index = 0
                else:
                    self._finished = True
                    self._release_drive()
                    return False

            self._step_started_ms = now

            (
                duration_ms,
                straight,
                turn,
            ) = steps[self._step_index]

        self._drivetrain.arcade(
            straight,
            turn,
        )

        self._owns_drive = True

        return True

    def stop(self):
        self._release_drive()

        self._active_emotion = None
        self._active_generation = None
        self._step_index = 0
        self._finished = False

    def owns_drive(self):
        return self._owns_drive

    def is_finished(self):
        return self._finished