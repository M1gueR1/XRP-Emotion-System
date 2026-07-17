import contextlib
import importlib.util
import io
import os
import sys
import unittest


MICROPYTHON_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

RECEIVER_PATH = os.path.join(
    MICROPYTHON_ROOT,
    "EmotionLib",
    "voice_command_receiver.py",
)

SPEC = importlib.util.spec_from_file_location(
    "voice_command_receiver_under_test",
    RECEIVER_PATH,
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
VoiceCommandReceiver = MODULE.VoiceCommandReceiver


class VoiceCommandReceiverTests(unittest.TestCase):
    def make_receiver(self):
        return VoiceCommandReceiver(
            activate_emotions=False
        )

    def test_legacy_tokens_are_unchanged(self):
        receiver = self.make_receiver()
        receiver.feed(
            "V:HV:SV:EV:IV:RV:LV:BV:XV:DV:ZV:P"
        )

        commands = []
        while receiver.has_command():
            commands.append(receiver.poll())

        self.assertEqual(
            commands,
            [
                "turn_happy",
                "turn_sad",
                "turn_excited",
                "turn_in_love",
                "turn_right",
                "turn_left",
                "turn_back",
                "stop",
                "showtime",
                "go_to_sleep",
                "lets_play",
            ],
        )

    def test_partial_v2_packet(self):
        receiver = self.make_receiver()
        receiver.feed("V2:C:10")

        self.assertIsNone(receiver.poll())

        receiver.feed("01:129\n")

        self.assertEqual(
            receiver.poll(),
            "custom:1001",
        )
        self.assertEqual(
            receiver.last_custom_emotion_id,
            129,
        )

    def test_multiple_v2_packets_in_one_chunk(self):
        receiver = self.make_receiver()
        receiver.feed(
            "V2:C:1001:129\nV2:C:1002:130\n"
        )

        self.assertEqual(
            receiver.poll(),
            "custom:1001",
        )
        self.assertEqual(
            receiver.poll(),
            "custom:1002",
        )

    def test_malformed_v2_does_not_stop_legacy_parsing(self):
        receiver = self.make_receiver()
        output = io.StringIO()

        with contextlib.redirect_stdout(output):
            receiver.feed(
                "V2:C:not-a-number:129\nV:H\n"
            )

        self.assertIn(
            "VOICE_V2:STATUS=ERROR:REASON=INVALID_PACKET",
            output.getvalue(),
        )
        self.assertEqual(
            receiver.poll(),
            "turn_happy",
        )

    def test_poll_advances_runtime_red_vision_display(self):
        class FakeDisplay:
            def __init__(self):
                self.update_count = 0

            def update(self):
                self.update_count += 1
                return True

        display = FakeDisplay()
        receiver = VoiceCommandReceiver(
            activate_emotions=True
        )
        receiver._get_runtime_red_vision_display = (
            lambda: display
        )

        self.assertIsNone(receiver.poll())
        self.assertEqual(
            display.update_count,
            1,
        )

    def test_display_update_failure_does_not_break_polling(self):
        class BrokenDisplay:
            def update(self):
                raise RuntimeError(
                    "display unavailable"
                )

        receiver = VoiceCommandReceiver(
            activate_emotions=True
        )
        receiver._get_runtime_red_vision_display = (
            lambda: BrokenDisplay()
        )
        receiver.feed("V:H")

        output = io.StringIO()

        with contextlib.redirect_stdout(output):
            command = receiver.poll()
            receiver.poll()

        self.assertEqual(command, "turn_happy")
        self.assertEqual(
            output.getvalue().count(
                "RED_VISION_UPDATE_FAILED"
            ),
            1,
        )


if __name__ == "__main__":
    unittest.main()
