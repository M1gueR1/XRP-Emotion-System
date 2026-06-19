class EmotionOutputHub:
    """
    Sends the same Emotion state to multiple outputs.

    Example outputs:
        XPPEmotionPublisher.publish_state
        RedVisionEmotionDisplay.apply_state

    A failure in one output does not prevent the
    remaining outputs from receiving the state,
    unless strict=True.
    """

    def __init__(
        self,
        *outputs,
        strict=False,
    ):
        if not isinstance(
            strict,
            bool,
        ):
            raise TypeError(
                "strict must be a boolean"
            )

        self._outputs = []
        self._strict = strict

        self._last_errors = []

        for output in outputs:
            self.add_output(
                output
            )


    def add_output(
        self,
        output,
    ):
        if not callable(output):
            raise TypeError(
                "output must be callable"
            )

        if output in self._outputs:
            return False

        self._outputs.append(
            output
        )

        return True


    def remove_output(
        self,
        output,
    ):
        if output not in self._outputs:
            return False

        self._outputs.remove(
            output
        )

        return True


    def publish_state(
        self,
        state,
    ):
        if not isinstance(
            state,
            dict,
        ):
            raise TypeError(
                "state must be a dictionary"
            )

        self._last_errors = []

        successful_outputs = 0

        for output in tuple(
            self._outputs
        ):
            try:
                output(state)

                successful_outputs += 1

            except Exception as error:
                self._last_errors.append(
                    (
                        output,
                        error,
                    )
                )

                print(
                    "Emotion output failed:"
                )

                print(error)

                if self._strict:
                    raise

        return successful_outputs


    def get_output_count(self):
        return len(
            self._outputs
        )


    def get_last_errors(self):
        return tuple(
            self._last_errors
        )


    def clear_errors(self):
        self._last_errors = []