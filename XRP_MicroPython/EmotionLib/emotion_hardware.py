from XRPLib.differential_drive import (
    DifferentialDrive,
)
from XRPLib.encoded_motor import (
    EncodedMotor,
)
from XRPLib.imu import IMU

from sys import implementation


class EmotionMotorAdapter:
    """
    Wraps an EncodedMotor with a logical role and
    optional direction inversion.
    """

    def __init__(
        self,
        motor,
        role_name,
        port_name,
        inverted=False,
    ):
        if motor is None:
            raise TypeError(
                "motor cannot be None"
            )

        if not isinstance(role_name, str):
            raise TypeError(
                "role_name must be a string"
            )

        if not isinstance(port_name, str):
            raise TypeError(
                "port_name must be a string"
            )

        if not isinstance(inverted, bool):
            raise TypeError(
                "inverted must be a boolean"
            )

        self._motor = motor
        self.role_name = role_name
        self.port_name = port_name
        self.inverted = inverted

        self._direction = (
            -1
            if inverted
            else 1
        )

    @property
    def raw_motor(self):
        return self._motor

    def set_effort(
        self,
        effort,
    ):
        self._motor.set_effort(
            effort * self._direction
        )

    def set_speed(
        self,
        speed_rpm=None,
    ):
        if speed_rpm is None:
            self._motor.set_speed()
            return

        self._motor.set_speed(
            speed_rpm * self._direction
        )

    def set_zero_effort_behavior(
        self,
        brake_at_zero_effort,
    ):
        self._motor.set_zero_effort_behavior(
            brake_at_zero_effort
        )

    def brake(self):
        self._motor.brake()

    def coast(self):
        self._motor.coast()

    def get_position(self):
        return (
            self._motor.get_position()
            * self._direction
        )

    def get_position_counts(self):
        return (
            self._motor
            .get_position_counts()
            * self._direction
        )

    def get_speed(self):
        return (
            self._motor.get_speed()
            * self._direction
        )

    def reset_encoder_position(self):
        self._motor.reset_encoder_position()


class EmotionHardwareConfig:
    """
    Maps logical emotion roles to physical XRP ports.

    Logical roles:
        drive_left
        drive_right
        aux_motor_1
        aux_motor_2

    Physical ports:
        L
        R
        3
        4
    """

    PORT_INDEXES = {
        "L": 1,
        "R": 2,
        "3": 3,
        "4": 4,
    }

    PORT_ALIASES = {
        "L": "L",
        "LEFT": "L",
        "1": "L",

        "R": "R",
        "RIGHT": "R",
        "2": "R",

        "3": "3",
        "MOTOR_3": "3",
        "MOTOR3": "3",

        "4": "4",
        "MOTOR_4": "4",
        "MOTOR4": "4",
    }

    ROLE_NAMES = (
        "drive_left",
        "drive_right",
        "aux_motor_1",
        "aux_motor_2",
    )

    def __init__(
        self,
        drive_left_port="L",
        drive_right_port="R",
        invert_left=False,
        invert_right=False,
        aux_motor_1_port=None,
        aux_motor_2_port=None,
        invert_aux_motor_1=False,
        invert_aux_motor_2=False,
        use_imu=True,
    ):
        self.drive_left_port = (
            self._normalize_port(
                drive_left_port,
                optional=False,
            )
        )

        self.drive_right_port = (
            self._normalize_port(
                drive_right_port,
                optional=False,
            )
        )

        self.aux_motor_1_port = (
            self._normalize_port(
                aux_motor_1_port,
                optional=True,
            )
        )

        self.aux_motor_2_port = (
            self._normalize_port(
                aux_motor_2_port,
                optional=True,
            )
        )

        self.invert_left = (
            self._validate_bool(
                "invert_left",
                invert_left,
            )
        )

        self.invert_right = (
            self._validate_bool(
                "invert_right",
                invert_right,
            )
        )

        self.invert_aux_motor_1 = (
            self._validate_bool(
                "invert_aux_motor_1",
                invert_aux_motor_1,
            )
        )

        self.invert_aux_motor_2 = (
            self._validate_bool(
                "invert_aux_motor_2",
                invert_aux_motor_2,
            )
        )

        self.use_imu = self._validate_bool(
            "use_imu",
            use_imu,
        )

        self._motor_cache = {}
        self._drivetrain = None

        self._validate_unique_ports()

    @staticmethod
    def _validate_bool(
        name,
        value,
    ):
        if not isinstance(value, bool):
            raise TypeError(
                name + " must be a boolean"
            )

        return value

    @classmethod
    def _normalize_port(
        cls,
        port_name,
        optional=False,
    ):
        if port_name is None:
            if optional:
                return None

            raise ValueError(
                "A drivetrain motor port "
                "cannot be None"
            )

        if not isinstance(port_name, str):
            raise TypeError(
                "motor port must be a string"
            )

        clean_port = (
            port_name
            .strip()
            .upper()
        )

        if (
            optional
            and clean_port in (
                "",
                "NONE",
                "NOT_USED",
            )
        ):
            return None

        if clean_port not in cls.PORT_ALIASES:
            raise ValueError(
                "Unknown motor port: "
                + clean_port
            )

        return cls.PORT_ALIASES[
            clean_port
        ]

    def _validate_unique_ports(self):
        assignments = (
            (
                "drive_left",
                self.drive_left_port,
            ),
            (
                "drive_right",
                self.drive_right_port,
            ),
            (
                "aux_motor_1",
                self.aux_motor_1_port,
            ),
            (
                "aux_motor_2",
                self.aux_motor_2_port,
            ),
        )

        used_ports = {}

        for role_name, port_name in assignments:
            if port_name is None:
                continue

            if port_name in used_ports:
                raise ValueError(
                    "Motor port "
                    + port_name
                    + " is assigned to both "
                    + used_ports[port_name]
                    + " and "
                    + role_name
                )

            used_ports[port_name] = role_name

    def _role_configuration(
        self,
        role_name,
    ):
        if role_name == "drive_left":
            return (
                self.drive_left_port,
                self.invert_left,
            )

        if role_name == "drive_right":
            return (
                self.drive_right_port,
                self.invert_right,
            )

        if role_name == "aux_motor_1":
            return (
                self.aux_motor_1_port,
                self.invert_aux_motor_1,
            )

        if role_name == "aux_motor_2":
            return (
                self.aux_motor_2_port,
                self.invert_aux_motor_2,
            )

        raise ValueError(
            "Unknown motor role: "
            + str(role_name)
        )

    @classmethod
    def _create_raw_motor(
        cls,
        port_name,
    ):
        motor_index = cls.PORT_INDEXES[
            port_name
        ]

        motor = (
            EncodedMotor
            .get_default_encoded_motor(
                index=motor_index
            )
        )

        # XRPLib currently returns an Exception object
        # when a requested port is unavailable.
        if isinstance(motor, Exception):
            raise ValueError(
                "Motor port "
                + port_name
                + " is not available "
                + "on this XRP board"
            )

        return motor

    def get_motor(
        self,
        role_name,
    ):
        if not isinstance(role_name, str):
            raise TypeError(
                "role_name must be a string"
            )

        clean_role = (
            role_name
            .strip()
            .lower()
        )

        if clean_role not in self.ROLE_NAMES:
            raise ValueError(
                "Unknown motor role: "
                + clean_role
            )

        if clean_role in self._motor_cache:
            return self._motor_cache[
                clean_role
            ]

        (
            port_name,
            inverted,
        ) = self._role_configuration(
            clean_role
        )

        if port_name is None:
            raise ValueError(
                "Motor role "
                + clean_role
                + " is not configured"
            )

        raw_motor = self._create_raw_motor(
            port_name
        )

        adapter = EmotionMotorAdapter(
            motor=raw_motor,
            role_name=clean_role,
            port_name=port_name,
            inverted=inverted,
        )

        self._motor_cache[
            clean_role
        ] = adapter

        return adapter

    def create_drivetrain(self):
        if self._drivetrain is not None:
            return self._drivetrain

        left_motor = self.get_motor(
            "drive_left"
        )

        right_motor = self.get_motor(
            "drive_right"
        )

        imu = None

        if self.use_imu:
            imu = IMU.get_default_imu()

        if (
            "NanoXRP"
            in implementation._machine
        ):
            self._drivetrain = (
                DifferentialDrive(
                    left_motor,
                    right_motor,
                    imu,
                    wheel_diam=3.46,
                    wheel_track=7.8,
                )
            )

        else:
            self._drivetrain = (
                DifferentialDrive(
                    left_motor,
                    right_motor,
                    imu,
                )
            )

        return self._drivetrain

    def get_mapping(self):
        return {
            "drive_left": {
                "port":
                    self.drive_left_port,
                "inverted":
                    self.invert_left,
            },
            "drive_right": {
                "port":
                    self.drive_right_port,
                "inverted":
                    self.invert_right,
            },
            "aux_motor_1": {
                "port":
                    self.aux_motor_1_port,
                "inverted":
                    self.invert_aux_motor_1,
            },
            "aux_motor_2": {
                "port":
                    self.aux_motor_2_port,
                "inverted":
                    self.invert_aux_motor_2,
            },
        }