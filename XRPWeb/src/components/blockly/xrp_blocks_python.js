import {pythonGenerator} from 'blockly/python';

import {
  getEmotionEntryByName,
} from "./emotionCatalogBridge";


// ---------------------------------------------------------
// Red Vision preload configuration
// ---------------------------------------------------------

const MAX_RED_VISION_PRELOADS = 4;


function getComposableEmotionPropertyBlocks(
  definitionBlock
) {
  const propertyBlocks = [];

  let currentBlock =
    definitionBlock
      .getInputTargetBlock(
        "PROPERTIES"
      );

  while (currentBlock) {
    propertyBlocks.push(
      currentBlock
    );

    currentBlock =
      currentBlock.getNextBlock();
  }

  return propertyBlocks;
}


function shouldPreloadEmotionDefinition(
  definitionBlock
) {
  if (
    definitionBlock.type ===
    "xrp_emotion_define"
  ) {
    return (
      definitionBlock.getFieldValue(
        "PRELOAD_RED_VISION"
      ) === "TRUE"
    );
  }

  if (
    definitionBlock.type !==
    "xrp_emotion_define_composable"
  ) {
    return false;
  }

  const preloadBlock =
    getComposableEmotionPropertyBlocks(
      definitionBlock
    ).find(
      (propertyBlock) =>
        propertyBlock.type ===
        "xrp_emotion_property_preload_red_vision"
    );

  return (
    preloadBlock?.getFieldValue(
      "PRELOAD_RED_VISION"
    ) === "TRUE"
  );
}


function getRedVisionPreloadNames(
  workspace
) {
  if (
    !workspace ||
    typeof workspace.getAllBlocks
      !== "function"
  ) {
    return [];
  }

  const emotionNames = [];
  const seenNames = new Set();

  const blocks =
    workspace.getAllBlocks(
      false
    );

  for (const currentBlock of blocks) {
    if (
      currentBlock.type !==
        "xrp_emotion_define" &&
      currentBlock.type !==
        "xrp_emotion_define_composable"
    ) {
      continue;
    }

    const shouldPreload =
      shouldPreloadEmotionDefinition(
        currentBlock
      );

    if (!shouldPreload) {
      continue;
    }

    const emotionName =
      currentBlock.getFieldValue(
        "EMOTION"
      );

    if (
      !emotionName ||
      seenNames.has(
        emotionName
      )
    ) {
      continue;
    }

    seenNames.add(
      emotionName
    );

    emotionNames.push(
      emotionName
    );
  }

  return emotionNames;
}


function createPythonStringTuple(
  values
) {
  const quotedValues =
    values.map(
      (value) =>
        JSON.stringify(value)
    );

  if (
    quotedValues.length === 1
  ) {
    return (
      `(${quotedValues[0]},)`
    );
  }

  return (
    `(${quotedValues.join(", ")},)`
  );
}


function updateRedVisionPreloadDefinition(
  workspace
) {
  const selectedEmotionNames =
    getRedVisionPreloadNames(
      workspace
    );

  const emotionNames =
    selectedEmotionNames.slice(
      0,
      MAX_RED_VISION_PRELOADS
    );

  if (
    emotionNames.length === 0
  ) {
    delete (
      pythonGenerator
        .definitions_[
          "emotion_display_preload"
        ]
    );

    delete (
      pythonGenerator
        .definitions_[
          "emotion_display_cache_warning"
        ]
    );

    return;
  }

  const emotionTuple =
    createPythonStringTuple(
      emotionNames
    );

  pythonGenerator.definitions_[
  "emotion_display_preload"
] = [
  "if USE_RED_VISION:",
  "    redVisionEmotionDisplay.preload(",
  `        ${emotionTuple}`,
  "    )",
].join("\n");

  if (
    selectedEmotionNames.length >
    MAX_RED_VISION_PRELOADS
  ) {
    pythonGenerator.definitions_[
      "emotion_display_cache_warning"
    ] = [
      "print(",
      '    "Red Vision cache warning: ",',
      `    "only the first ${MAX_RED_VISION_PRELOADS} emotions were preloaded",`,
      ")",
    ].join("\n");
  } else {
    delete (
      pythonGenerator
        .definitions_[
          "emotion_display_cache_warning"
        ]
    );
  }
}

// ---------------------------------------------------------
// Base Emotion setup
// ---------------------------------------------------------

function setupEmotionGenerator() {
  pythonGenerator.definitions_[
    "import_emotion"
  ] = [
    "from EmotionLib import (",
    "    Emotion,",
    "    EmotionDefinition,",
    "    EmotionOutputHub,",
    "    RedVisionEmotionDisplay,",
    "    XPPEmotionPublisher,",
    ")",
  ].join("\n");


  /*
   * Global default.
   *
   * A Configure Red Vision block can replace
   * this definition with False.
   *
   * This definition is deliberately created
   * before emotion_setup, so USE_RED_VISION
   * exists before the display constructor runs.
   */
  if (
    !pythonGenerator.definitions_[
      "emotion_red_vision_mode"
    ]
  ) {
    pythonGenerator.definitions_[
      "emotion_red_vision_mode"
    ] =
      "USE_RED_VISION = True";
  }


  pythonGenerator.definitions_[
    "emotion_setup"
  ] = [
    "emotionPublisher = XPPEmotionPublisher()",
    "",
    "redVisionEmotionDisplay = (",
    "    RedVisionEmotionDisplay(",
    '        sheets_directory="/emotion_sheets_192",',
    '        custom_sheets_directory="/emotion_sheets_custom",',
    "        strict_assets=False,",
    `        cache_capacity=${MAX_RED_VISION_PRELOADS},`,
    "        debug=False,",
    "        enabled=USE_RED_VISION,",
    "        strict_display=False,",
    "    )",
    ")",
    "",
    "emotionOutputs = EmotionOutputHub(",
    "    emotionPublisher.publish_state,",
    "    redVisionEmotionDisplay.apply_state,",
    "    strict=False,",
    ")",
    "",
    "emotion = Emotion(",
    "    publisher=emotionOutputs.publish_state,",
    "    min_time_before_switch_ms=0,",
    ")",
  ].join("\n");
}

function ensureSafeEmotionUpdateGenerator() {
  setupEmotionGenerator();

  pythonGenerator.definitions_[
    'xrp_runtime_safety_state'
  ] = [
    "xrp_red_vision_error_count = 0",
    "xrp_red_vision_enabled = True",
    "XRP_MAX_DRIVE_SECONDS = 3.0",
    "XRP_MAX_ARCADE_VALUE = 0.6",
  ].join("\n");

  pythonGenerator.definitions_[
    'xrp_runtime_safety_helpers'
  ] = [
    "def xrp_clamp(value, low, high):",
    "    try:",
    "        numeric_value = float(value)",
    "    except Exception:",
    "        numeric_value = 0.0",
    "    if numeric_value < low:",
    "        return low",
    "    if numeric_value > high:",
    "        return high",
    "    return numeric_value",
    "",
    "def xrp_safe_stop_motors():",
    "    if 'differentialDrive' in globals():",
    "        try:",
    "            differentialDrive.stop()",
    "        except Exception:",
    "            pass",
    "",
    "def xrp_stop_requested():",
    "    if 'board' in globals():",
    "        try:",
    "            if board.is_button_pressed():",
    "                print('Safe stop requested by XRP button')",
    "                return True",
    "        except Exception:",
    "            pass",
    "    if 'voiceCommandReceiver' in globals():",
    "        try:",
    "            pending_command = voiceCommandReceiver.poll()",
    "        except Exception:",
    "            pending_command = None",
    "        if pending_command is not None:",
    "            globals()['voiceCommand'] = pending_command",
    "            if pending_command == 'stop':",
    "                print('Safe stop requested by voice')",
    "                return True",
    "    return False",
  ].join("\n");

  pythonGenerator.definitions_[
    'xrp_safe_emotion_update'
  ] = [
    "def xrp_safe_emotion_update():",
    "    global xrp_red_vision_error_count",
    "    global xrp_red_vision_enabled",
    "    try:",
    "        emotion.run_emotion()",
    "    except Exception as error:",
    "        print(",
    '            "Safe emotion runtime error:",',
    "            error,",
    "        )",
    "        xrp_safe_stop_motors()",
    "        return False",
    "",
    "    if (",
    "        'USE_RED_VISION' in globals() and",
    "        USE_RED_VISION and",
    "        xrp_red_vision_enabled and",
    "        'redVisionEmotionDisplay' in globals()",
    "    ):",
    "        try:",
    "            redVisionEmotionDisplay.update()",
    "            xrp_red_vision_error_count = 0",
    "        except Exception as error:",
    "            xrp_red_vision_error_count += 1",
    "            print(",
    '                "Red Vision update error:",',
    "                error,",
    "            )",
    "            xrp_safe_stop_motors()",
    "            if xrp_red_vision_error_count >= 3:",
    "                xrp_red_vision_enabled = False",
    "                print(",
    '                    "Red Vision disabled after repeated errors"', 
    "                )",
    "            return False",
    "",
    "    return True",
  ].join("\n");
}


pythonGenerator.forBlock[
  "xrp_emotion_configure_red_vision"
] = function (block) {
  const enabled =
    emotionPythonBoolean(
      block.getFieldValue(
        "ENABLED"
      )
    );

  /*
   * Replaces the global default created by
   * setupEmotionGenerator().
   *
   * The definition keeps its original position,
   * before emotion_setup.
   */
  pythonGenerator.definitions_[
    "emotion_red_vision_mode"
  ] =
    `USE_RED_VISION = ${enabled}`;

  setupEmotionGenerator();

  /*
   * This is a configuration block. It does not
   * generate code at its visual position.
   */
  return "";
};

function ensureEmotionRegistration(
  emotionName
) {
  setupEmotionGenerator();

  const catalogEntry =
    getEmotionEntryByName(
      emotionName
    );

  if (!catalogEntry) {
    throw new Error(
      `Unknown emotion: ${emotionName}`
    );
  }

  const definitionKey =
    `emotion_definition_${emotionName}`;

  /*
   * Register official and custom emotions.
   * A Define emotion block can overwrite this
   * generated default using the same key.
   */
  if (
    !pythonGenerator.definitions_[
      definitionKey
    ]
  ) {
    const repeatMode =
      catalogEntry.repeatMode === null
        ? "None"
        : `"${catalogEntry.repeatMode}"`;

    const repeatCount =
      catalogEntry.repeatCount === null
        ? "None"
        : String(
            catalogEntry.repeatCount
          );

    pythonGenerator.definitions_[
      definitionKey
    ] = [
      "emotion.register_definition(",
      "    EmotionDefinition(",
      `        name="${emotionName}",`,
      `        emotion_id=${catalogEntry.emotionId},`,
      `        playback_fps=${catalogEntry.defaultFps},`,
      "        frame_subset=None,",
      "        min_time_before_switch_ms=None,",
      `        repeat_mode=${repeatMode},`,
      `        repeat_count=${repeatCount},`,
      "        flag_overrides=(",
      '            "dashboard_screen",',
      "        ),",
      "    )",
      ")",
    ].join("\n");
  }

  return catalogEntry.emotionId;
}


function setupEmotionStateTrackerGenerator() {
  setupEmotionGenerator();

  pythonGenerator.definitions_[
    "xrp_emotion_state_tracker"
  ] = [
    "xrp_current_emotion_name = None",
    "",
    "def xrp_set_emotion(emotion_name, force_reset=False):",
    "    global xrp_current_emotion_name",
    "    emotion.set_emotion(",
    "        emotion_name,",
    "        force_reset=force_reset,",
    "    )",
    "    xrp_current_emotion_name = emotion_name",
    "",
    "def xrp_current_emotion_is(emotion_name):",
    "    return xrp_current_emotion_name == emotion_name",
  ].join("\n");
}

function emotionPythonBoolean(value) {
  return (
    value === true ||
    value === "TRUE" ||
    value === "True"
  )
    ? "True"
    : "False";
}

//Individual Motors
pythonGenerator.forBlock['xrp_motor_effort'] = function (block) {
  pythonGenerator.definitions_['import_motor'] = 'from XRPLib.encoded_motor import EncodedMotor';
  var index = block.getFieldValue("MOTOR");
  pythonGenerator.definitions_[`motor${index}_setup`] = `motor${index} = EncodedMotor.get_default_encoded_motor(${index})`;
  var value_effort = pythonGenerator.valueToCode(block, 'effort', pythonGenerator.ORDER_ATOMIC);
  var code = `motor${index}.set_effort(${value_effort})\n`;
  return code;
};

pythonGenerator.forBlock['xrp_motor_speed'] = function (block) {
  pythonGenerator.definitions_['import_motor'] = 'from XRPLib.encoded_motor import EncodedMotor';
  var index = block.getFieldValue("MOTOR");
  pythonGenerator.definitions_[`motor${index}_setup`] = `motor${index} = EncodedMotor.get_default_encoded_motor(${index})`;
  var value_speed = pythonGenerator.valueToCode(block, 'speed', pythonGenerator.ORDER_ATOMIC);
  if(value_speed == 0) value_speed = "";
  var code = `motor${index}.set_speed(${value_speed})\n`;
  return code;
};

pythonGenerator.forBlock['xrp_motor_get_speed'] = function (block) {
  pythonGenerator.definitions_['import_motor'] = 'from XRPLib.encoded_motor import EncodedMotor';
  var index = block.getFieldValue("MOTOR");
  pythonGenerator.definitions_[`motor${index}_setup`] = `motor${index} = EncodedMotor.get_default_encoded_motor(${index})`;
  var code = `motor${index}.get_speed()`;
  return [code, pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_motor_direction'] = function (block) {
  pythonGenerator.definitions_['import_motor'] = 'from XRPLib.encoded_motor import EncodedMotor';
  var index = block.getFieldValue("MOTOR");
  pythonGenerator.definitions_[`motor${index}_setup`] = `motor${index} = EncodedMotor.get_default_encoded_motor(${index})`;
  var value_direction = block.getFieldValue("DIRECTION");
  var code = `motor${index}._motor.flip_dir = (${value_direction})\n`;
  return code;
};

pythonGenerator.forBlock['xrp_motor_get_position'] = function (block) {
  pythonGenerator.definitions_['import_motor'] = 'from XRPLib.encoded_motor import EncodedMotor';
  var index = block.getFieldValue("MOTOR");
  pythonGenerator.definitions_[`motor${index}_setup`] = `motor${index} = EncodedMotor.get_default_encoded_motor(${index})`;
  var code = `motor${index}.get_position()`;
  return [code, pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_motor_get_count'] = function (block) {
  pythonGenerator.definitions_['import_motor'] = 'from XRPLib.encoded_motor import EncodedMotor';
  var index = block.getFieldValue("MOTOR");
  pythonGenerator.definitions_[`motor${index}_setup`] = `motor${index} = EncodedMotor.get_default_encoded_motor(${index})`;
  var code = `motor${index}.get_position_counts()`;
  return [code, pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_motor_reset_position'] = function (block) {
  pythonGenerator.definitions_['import_motor'] = 'from XRPLib.encoded_motor import EncodedMotor';
  var index = block.getFieldValue("MOTOR");
  pythonGenerator.definitions_[`motor${index}_setup`] = `motor${index} = EncodedMotor.get_default_encoded_motor(${index})`;
  var code = `motor${index}.reset_encoder_position()\n`;
  return code;
};

//DriveTrain
pythonGenerator.forBlock['xrp_straight_effort'] = function (block) {
  pythonGenerator.definitions_['import_drivetrain'] = 'from XRPLib.differential_drive import DifferentialDrive';
  pythonGenerator.definitions_[`drietrain_setup`] = `differentialDrive = DifferentialDrive.get_default_differential_drive()`;
  var value_dist = pythonGenerator.valueToCode(block, 'dist', pythonGenerator.ORDER_ATOMIC);
  var value_effort = pythonGenerator.valueToCode(block, 'effort', pythonGenerator.ORDER_ATOMIC);
  var code = `differentialDrive.straight(${value_dist}, ${value_effort})\n`;
  return code;
};

pythonGenerator.forBlock['xrp_turn_effort'] = function (block) {
  pythonGenerator.definitions_['import_drivetrain'] = 'from XRPLib.differential_drive import DifferentialDrive';
  pythonGenerator.definitions_[`drietrain_setup`] = `differentialDrive = DifferentialDrive.get_default_differential_drive()`;
  var value_angle = pythonGenerator.valueToCode(block, 'degrees', pythonGenerator.ORDER_ATOMIC);
  var value_effort = pythonGenerator.valueToCode(block, 'effort', pythonGenerator.ORDER_ATOMIC);
  var code = `differentialDrive.turn(${value_angle}, ${value_effort})\n`;
  return code;
};

pythonGenerator.forBlock['xrp_seteffort'] = function (block) {
  pythonGenerator.definitions_['import_drivetrain'] = 'from XRPLib.differential_drive import DifferentialDrive';
  pythonGenerator.definitions_[`drietrain_setup`] = `differentialDrive = DifferentialDrive.get_default_differential_drive()`;
  var value_l = pythonGenerator.valueToCode(block, 'LEFT', pythonGenerator.ORDER_ATOMIC);
  var value_r = pythonGenerator.valueToCode(block, 'RIGHT', pythonGenerator.ORDER_ATOMIC);
  var code = `differentialDrive.set_effort(${value_l}, ${value_r})\n`;
  return code;
};

pythonGenerator.forBlock['xrp_speed'] = function (block) {
  pythonGenerator.definitions_['import_drivetrain'] = 'from XRPLib.differential_drive import DifferentialDrive';
  pythonGenerator.definitions_[`drietrain_setup`] = `differentialDrive = DifferentialDrive.get_default_differential_drive()`;
  var value_l = pythonGenerator.valueToCode(block, 'LEFT', pythonGenerator.ORDER_ATOMIC);
  var value_r = pythonGenerator.valueToCode(block, 'RIGHT', pythonGenerator.ORDER_ATOMIC)
  var code = `differentialDrive.set_speed(${value_l}, ${value_r})\n`;
  return code;
};

pythonGenerator.forBlock['xrp_arcade'] = function (block) {
  pythonGenerator.definitions_['import_drivetrain'] = 'from XRPLib.differential_drive import DifferentialDrive';
  pythonGenerator.definitions_[`drietrain_setup`] = `differentialDrive = DifferentialDrive.get_default_differential_drive()`;
  var value_s = pythonGenerator.valueToCode(block, 'STRAIGHT', pythonGenerator.ORDER_ATOMIC);
  var value_t = pythonGenerator.valueToCode(block, 'TURN', pythonGenerator.ORDER_ATOMIC);
  var code = `differentialDrive.arcade(${value_s}, ${value_t})\n`;
  return code;
};

pythonGenerator.forBlock['xrp_arcade_for_seconds'] = function (block) {
  pythonGenerator.definitions_['import_drivetrain'] = 'from XRPLib.differential_drive import DifferentialDrive';
  pythonGenerator.definitions_['import_time'] = 'import time';
  pythonGenerator.definitions_[`drietrain_setup`] = `differentialDrive = DifferentialDrive.get_default_differential_drive()`;

  ensureSafeEmotionUpdateGenerator();

  pythonGenerator.definitions_[
    'xrp_wait_with_safe_updates'
  ] = [
    "def xrp_wait_with_safe_updates(duration_s):",
    "    duration_s = xrp_clamp(",
    "        duration_s,",
    "        0.0,",
    "        XRP_MAX_DRIVE_SECONDS,",
    "    )",
    "    duration_ms = int(duration_s * 1000)",
    "    start_ms = time.ticks_ms()",
    "    while time.ticks_diff(time.ticks_ms(), start_ms) < duration_ms:",
    "        if xrp_stop_requested():",
    "            xrp_safe_stop_motors()",
    "            return False",
    "        xrp_safe_emotion_update()",
    "        time.sleep(0.02)",
    "    return True",
  ].join("\n");

  var value_s = pythonGenerator.valueToCode(block, 'STRAIGHT', pythonGenerator.ORDER_ATOMIC) || "0";
  var value_t = pythonGenerator.valueToCode(block, 'TURN', pythonGenerator.ORDER_ATOMIC) || "0";
  var value_seconds = pythonGenerator.valueToCode(block, 'SECONDS', pythonGenerator.ORDER_ATOMIC) || "0";

  var straightVar =
    pythonGenerator.nameDB_
      ? pythonGenerator.nameDB_.getDistinctName(
          "xrp_arcade_straight",
          "VARIABLE"
        )
      : "xrp_arcade_straight";

  var turnVar =
    pythonGenerator.nameDB_
      ? pythonGenerator.nameDB_.getDistinctName(
          "xrp_arcade_turn",
          "VARIABLE"
        )
      : "xrp_arcade_turn";

  var secondsVar =
    pythonGenerator.nameDB_
      ? pythonGenerator.nameDB_.getDistinctName(
          "xrp_arcade_seconds",
          "VARIABLE"
        )
      : "xrp_arcade_seconds";

  var code = [
    `${straightVar} = xrp_clamp(${value_s}, -XRP_MAX_ARCADE_VALUE, XRP_MAX_ARCADE_VALUE)`,
    `${turnVar} = xrp_clamp(${value_t}, -XRP_MAX_ARCADE_VALUE, XRP_MAX_ARCADE_VALUE)`,
    `${secondsVar} = xrp_clamp(${value_seconds}, 0.0, XRP_MAX_DRIVE_SECONDS)`,
    "try:",
    `  differentialDrive.arcade(${straightVar}, ${turnVar})`,
    `  xrp_wait_with_safe_updates(${secondsVar})`,
    "finally:",
    "  differentialDrive.stop()",
  ].join("\n") + "\n";

  return code;
};


pythonGenerator.forBlock['xrp_stop_motors'] = function (block) {
  pythonGenerator.definitions_['import_drivetrain'] = 'from XRPLib.differential_drive import DifferentialDrive';
  pythonGenerator.definitions_[`drietrain_setup`] = `differentialDrive = DifferentialDrive.get_default_differential_drive()`;
  var code = `differentialDrive.stop()\n`;
  return code;
};

pythonGenerator.forBlock['xrp_resetencoders'] = function (block) {
  pythonGenerator.definitions_['import_drivetrain'] = 'from XRPLib.differential_drive import DifferentialDrive';
  pythonGenerator.definitions_[`drietrain_setup`] = `differentialDrive = DifferentialDrive.get_default_differential_drive()`;
  var value_degrees = pythonGenerator.valueToCode(block, 'degrees', pythonGenerator.ORDER_ATOMIC);
  var code = `differentialDrive.reset_encoder_position()\n`;
  return code;
};

pythonGenerator.forBlock['xrp_getleftencoder'] = function (block) {
  pythonGenerator.definitions_['import_drivetrain'] = 'from XRPLib.differential_drive import DifferentialDrive';
  pythonGenerator.definitions_[`drietrain_setup`] = `differentialDrive = DifferentialDrive.get_default_differential_drive()`;
  var code = `differentialDrive.get_left_encoder_position()`;
  return [code, pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_getrightencoder'] = function (block) {
  pythonGenerator.definitions_['import_drivetrain'] = 'from XRPLib.differential_drive import DifferentialDrive';
  pythonGenerator.definitions_[`drietrain_setup`] = `differentialDrive = DifferentialDrive.get_default_differential_drive()`;
  var code = `differentialDrive.get_right_encoder_position()`;
  return [code, pythonGenerator.ORDER_NONE];
};

//Servo
pythonGenerator.forBlock['xrp_servo_deg'] = function (block) {
  pythonGenerator.definitions_['import_servo'] = 'from XRPLib.servo import Servo';
  var index = block.getFieldValue("SERVO");
  if(index == 1){
    pythonGenerator.definitions_[`servo_setup`] = `servo1 = Servo.get_default_servo(1)`;
  }
  else {
    pythonGenerator.definitions_[`servo2_setup`] = `servo2 = Servo.get_default_servo(2)`;
  }
  var value_degrees = pythonGenerator.valueToCode(block, 'degrees', pythonGenerator.ORDER_ATOMIC);
  var code = `servo${index}.set_angle(${value_degrees})\n`;
  return code;
};

//Distance
pythonGenerator.forBlock['xrp_getsonardist'] = function (block) {
  pythonGenerator.definitions_['import_rangefinder'] = 'from XRPLib.rangefinder import Rangefinder';
  pythonGenerator.definitions_[`rangefinder_setup`] = `rangefinder = Rangefinder.get_default_rangefinder()`;
  var code = `rangefinder.distance()`;
  return [code, pythonGenerator.ORDER_NONE];
};

//reflectance
pythonGenerator.forBlock['xrp_l_refl'] = function (block) {
  pythonGenerator.definitions_['import_reflectance'] = 'from XRPLib.reflectance import Reflectance';
  pythonGenerator.definitions_[`reflectance_setup`] = `reflectance = Reflectance.get_default_reflectance()`;
  var code = `reflectance.get_left()`;
  return [code, pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_r_refl'] = function (block) {
  pythonGenerator.definitions_['import_reflectance'] = 'from XRPLib.reflectance import Reflectance';
  pythonGenerator.definitions_[`reflectance_setup`] = `reflectance = Reflectance.get_default_reflectance()`;
  var code = `reflectance.get_right()`;
  return [code, pythonGenerator.ORDER_NONE];
};

// NanoXRP only - middle reflectance sensor
pythonGenerator.forBlock['xrp_m_refl'] = function (block) {
  pythonGenerator.definitions_['import_reflectance'] = 'from XRPLib.reflectance import Reflectance';
  pythonGenerator.definitions_[`reflectance_setup`] = `reflectance = Reflectance.get_default_reflectance()`;
  var code = `reflectance.get_middle()`;
  return [code, pythonGenerator.ORDER_NONE];
};

//Gyro
pythonGenerator.forBlock['xrp_yaw'] = function (block) {
  pythonGenerator.definitions_['import_imu'] = 'from XRPLib.imu import IMU';
  pythonGenerator.definitions_[`imu_setup`] = `imu = IMU.get_default_imu()\nimu.calibrate(1)`;
  var code = `imu.get_yaw()`;
  return [code, pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_roll'] = function (block) {
  pythonGenerator.definitions_['import_imu'] = 'from XRPLib.imu import IMU';
  pythonGenerator.definitions_[`imu_setup`] = `imu = IMU.get_default_imu()\nimu.calibrate(1)`;
  var code = `imu.get_roll()`;
  return [code, pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_pitch'] = function (block) {
  pythonGenerator.definitions_['import_imu'] = 'from XRPLib.imu import IMU';
  pythonGenerator.definitions_[`imu_setup`] = `imu = IMU.get_default_imu()\nimu.calibrate(1)`;
  var code = `imu.get_pitch()`;
  return [code, pythonGenerator.ORDER_NONE];
};

//Accelerometer
pythonGenerator.forBlock['xrp_acc_x'] = function (block) {
  pythonGenerator.definitions_['import_imu'] = 'from XRPLib.imu import IMU';
  pythonGenerator.definitions_[`imu_setup`] = `imu = IMU.get_default_imu()\nimu.calibrate(1)`;
  var code = `imu.get_acc_x()`;
  return [code, pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_acc_y'] = function (block) {
  pythonGenerator.definitions_['import_imu'] = 'from XRPLib.imu import IMU';
  pythonGenerator.definitions_[`imu_setup`] = `imu = IMU.get_default_imu()\nimu.calibrate(1)`;
  var code = `imu.get_acc_y()`;
  return [code, pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_acc_z'] = function (block) {
  pythonGenerator.definitions_['import_imu'] = 'from XRPLib.imu import IMU';
  pythonGenerator.definitions_[`imu_setup`] = `imu = IMU.get_default_imu()\nimu.calibrate(1)`;
  var code = `imu.get_acc_z()`;
  return [code, pythonGenerator.ORDER_NONE];
};

//Control Board
pythonGenerator.forBlock['xrp_led_on'] = function (block) {
  pythonGenerator.definitions_['import_board'] = 'from XRPLib.board import Board';
  pythonGenerator.definitions_[`board_setup`] = `board = Board.get_default_board()`;
  var code = `board.led_on()\n`;
  return code;
};

pythonGenerator.forBlock['xrp_led_off'] = function (block) {
  pythonGenerator.definitions_['import_board'] = 'from XRPLib.board import Board';
  pythonGenerator.definitions_[`board_setup`] = `board = Board.get_default_board()`;
  var code = `board.led_off()\n`;
  return code;
};

pythonGenerator.forBlock['xrp_button_pressed'] = function (block) {
  pythonGenerator.definitions_['import_board'] = 'from XRPLib.board import Board';
  pythonGenerator.definitions_[`board_setup`] = `board = Board.get_default_board()`;
  var code = `board.is_button_pressed()`;
  return [code, pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_wait_for_button_press'] = function (block) {
  pythonGenerator.definitions_['import_board'] = 'from XRPLib.board import Board';
  pythonGenerator.definitions_[`board_setup`] = `board = Board.get_default_board()`;
  var code = `board.wait_for_button()\n`
  return code;
};

//emociotions

// ---------------------------------------------------------
// Emotion setup
// ---------------------------------------------------------

// ---------------------------------------------------------
// Emotion hardware and motion setup
// ---------------------------------------------------------

function setupEmotionHardwareGenerator() {
  setupEmotionGenerator();

  pythonGenerator.definitions_[
    "import_emotion_hardware"
  ] =
    "from EmotionLib import " +
    "EmotionHardwareConfig, " +
    "EmotionMotionController";

  /*
   * Default mapping when the student does not add
   * a Configure emotion hardware block.
   */
  if (
    !pythonGenerator.definitions_[
      "emotion_hardware_setup"
    ]
  ) {
    pythonGenerator.definitions_[
      "emotion_hardware_setup"
    ] = [
      "emotionHardware = EmotionHardwareConfig(",
      '    drive_left_port="L",',
      '    drive_right_port="R",',
      ")",
      "emotionDrive = " +
        "emotionHardware.create_drivetrain()",
      "emotionMotion = " +
        "EmotionMotionController(" +
        "emotionDrive)",
      "emotion.set_motion_controller(" +
        "emotionMotion)",
    ].join("\n");
  }
}


function setupEmotionMotionGenerator() {
  setupEmotionHardwareGenerator();
}




// ---------------------------------------------------------
// Helper: convert frame text into a Python tuple
// ---------------------------------------------------------

function emotionFrameTuple(
  frameMode,
  frameText
) {
  if (frameMode !== "CUSTOM") {
    return "None";
  }

  const studentFrameNumbers =
    String(frameText)
      .split(",")
      .map(
        (item) =>
          Number(item.trim())
      )
      .filter(
        (item) =>
          Number.isInteger(item) &&
          item >= 1 &&
          item <= 16
      );

  if (
    studentFrameNumbers.length === 0
  ) {
    return "None";
  }

  /*
   * Blockly shows frames starting at 1 because
   * that is more natural for students.
   *
   * EmotionLib and XRPWeb use indexes starting
   * at zero.
   */
  const internalFrameIndexes =
    studentFrameNumbers.map(
      (frameNumber) =>
        frameNumber - 1
    );

  if (
    internalFrameIndexes.length === 1
  ) {
    return (
      `(${internalFrameIndexes[0]},)`
    );
  }

  return (
    `(${internalFrameIndexes.join(
      ", "
    )})`
  );
}


// ---------------------------------------------------------
// Helper: create Python override flag tuple
// ---------------------------------------------------------

function emotionFlagTuple(block) {
  const flags = [];

  if (
    block.getFieldValue(
      "OVERRIDE_DASHBOARD"
    ) === "TRUE"
  ) {
    flags.push(
      "dashboard_screen"
    );
  }

  if (
    block.getFieldValue(
      "OVERRIDE_DRIVETRAIN"
    ) === "TRUE"
  ) {
    flags.push(
      "drivetrain"
    );
  }

  if (
    block.getFieldValue(
      "OVERRIDE_LED"
    ) === "TRUE"
  ) {
    flags.push(
      "led"
    );
  }

  if (flags.length === 0) {
    return "None";
  }

  const quotedFlags = flags.map(
    (flag) => `"${flag}"`
  );

  if (quotedFlags.length === 1) {
    return `(${quotedFlags[0]},)`;
  }

  return `(${quotedFlags.join(", ")})`;
}


function normalizeEmotionFrameSubset(
  emotionId,
  frameSubset
) {
  /*
   * Red Vision custom uploads are intentionally
   * stored as one static 192x192 frame on the XRP.
   * However, official emotions such as happy and sad
   * must continue to use their full built-in sheets.
   *
   * This guard prevents an accidentally persisted
   * one-frame Blockly subset from making official
   * Red Vision animations look static.
   */
  const isOfficialEmotion =
    emotionId < 128;

  if (
    isOfficialEmotion &&
    frameSubset === "(0,)"
  ) {
    return "None";
  }

  return frameSubset;
}


function createEmotionDefinitionCode({
  emotionName,
  emotionId,
  playbackFps,
  frameSubset,
  minimumSwitchTime,
  repeatMode,
  repeatCount,
  flagOverrides,
}) {
  const normalizedFrameSubset =
    normalizeEmotionFrameSubset(
      emotionId,
      frameSubset
    );

  return [
    "emotion.register_definition(",
    "    EmotionDefinition(",
    `        name="${emotionName}",`,
    `        emotion_id=${emotionId},`,

    "        playback_fps=" +
      (
        playbackFps === null
          ? "None"
          : playbackFps
      ) +
      ",",

    `        frame_subset=${normalizedFrameSubset},`,

    "        min_time_before_switch_ms=" +
      (
        minimumSwitchTime === null
          ? "None"
          : minimumSwitchTime
      ) +
      ",",

    "        repeat_mode=" +
      (
        repeatMode === null
          ? "None"
          : `"${repeatMode}"`
      ) +
      ",",

    "        repeat_count=" +
      (
        repeatCount === null
          ? "None"
          : repeatCount
      ) +
      ",",

    `        flag_overrides=${flagOverrides},`,

    "    )",
    ")",
  ].join("\n");
}


// ---------------------------------------------------------
// Define emotion generator
// ---------------------------------------------------------

pythonGenerator.forBlock[
  "xrp_emotion_define"
] = function (block) {
  setupEmotionGenerator();

  const emotionName =
    block.getFieldValue(
      "EMOTION"
    );

  const catalogEntry =
    getEmotionEntryByName(
      emotionName
    );

  if (!catalogEntry) {
    throw new Error(
      `Unknown emotion: ${emotionName}`
    );
  }

  const emotionId =
    catalogEntry.emotionId;

  const fpsMode =
    block.getFieldValue(
      "FPS_MODE"
    );

  const playbackFps =
    fpsMode === "CUSTOM"
      ? Number(
          block.getFieldValue(
            "FPS"
          )
        )
      : null;

  const minTimeMode =
    block.getFieldValue(
      "MIN_TIME_MODE"
    );

  const minimumSwitchTime =
    minTimeMode === "CUSTOM"
      ? Number(
          block.getFieldValue(
            "MIN_TIME"
          )
        )
      : null;

  const frameSubset =
    emotionFrameTuple(
      block.getFieldValue(
        "FRAME_MODE"
      ),
      block.getFieldValue(
        "FRAME_SUBSET"
      )
    );

  const rawRepeatMode =
    block.getFieldValue(
      "REPEAT_MODE"
    );

  const repeatMode =
    rawRepeatMode === "DEFAULT"
      ? null
      : rawRepeatMode;

  const repeatCount =
    repeatMode === "count"
      ? Number(
          block.getFieldValue(
            "REPEAT_COUNT"
          )
        )
      : null;

  const flagOverrides =
    emotionFlagTuple(block);

  const definitionCode =
    createEmotionDefinitionCode({
      emotionName,
      emotionId,
      playbackFps,
      frameSubset,
      minimumSwitchTime,
      repeatMode,
      repeatCount,
      flagOverrides,
    });

  /*
   * Store the definition at the beginning of the
   * generated Python program.
   *
   * This prevents registering the emotion repeatedly
   * if the Blockly block is placed inside a loop.
   */
  pythonGenerator.definitions_[
    `emotion_definition_${emotionName}`
  ] = definitionCode;

  updateRedVisionPreloadDefinition(
    block.workspace
  );

  // Nothing is generated at the block's visual position.
  return "";
};


function getComposableEmotionConfiguration(
  block
) {
  const configuration = {
    playbackFps: null,
    frameSubset: "None",
    minimumSwitchTime: null,
    repeatMode: null,
    repeatCount: null,

    /*
     * The composable block is designed for motion-aware
     * classroom projects. When students omit the permission
     * setting, dashboard and drivetrain remain available.
     */
    flagOverrides:
      '("dashboard_screen", "drivetrain")',
  };

  const propertyBlocks =
    getComposableEmotionPropertyBlocks(
      block
    );

  for (const propertyBlock of propertyBlocks) {
    switch (propertyBlock.type) {
      case "xrp_emotion_property_animation_speed":
        configuration.playbackFps =
          Number(
            propertyBlock.getFieldValue(
              "FPS"
            )
          );
        break;

      case "xrp_emotion_property_minimum_switch_time":
        configuration.minimumSwitchTime =
          Number(
            propertyBlock.getFieldValue(
              "MIN_TIME"
            )
          );
        break;

      case "xrp_emotion_property_animation_frames":
        configuration.frameSubset =
          emotionFrameTuple(
            propertyBlock.getFieldValue(
              "FRAME_MODE"
            ),
            propertyBlock.getFieldValue(
              "FRAME_SUBSET"
            )
          );
        break;

      case "xrp_emotion_property_animation_repeat": {
        const repeatMode =
          propertyBlock.getFieldValue(
            "REPEAT_MODE"
          );

        configuration.repeatMode =
          repeatMode;

        configuration.repeatCount =
          repeatMode === "count"
            ? Number(
                propertyBlock.getFieldValue(
                  "REPEAT_COUNT"
                )
              )
            : null;
        break;
      }

      case "xrp_emotion_property_control_permissions":
        configuration.flagOverrides =
          emotionFlagTuple(
            propertyBlock
          );
        break;

      default:
        break;
    }
  }

  return configuration;
}


pythonGenerator.forBlock[
  "xrp_emotion_define_composable"
] = function (block) {
  setupEmotionGenerator();

  const emotionName =
    block.getFieldValue(
      "EMOTION"
    );

  const catalogEntry =
    getEmotionEntryByName(
      emotionName
    );

  if (!catalogEntry) {
    throw new Error(
      `Unknown emotion: ${emotionName}`
    );
  }

  const configuration =
    getComposableEmotionConfiguration(
      block
    );

  const definitionCode =
    createEmotionDefinitionCode({
      emotionName,
      emotionId:
        catalogEntry.emotionId,
      ...configuration,
    });

  pythonGenerator.definitions_[
    `emotion_definition_${emotionName}`
  ] = definitionCode;

  updateRedVisionPreloadDefinition(
    block.workspace
  );

  return "";
};


const composableEmotionPropertyTypes = [
  "xrp_emotion_property_animation_speed",
  "xrp_emotion_property_minimum_switch_time",
  "xrp_emotion_property_animation_frames",
  "xrp_emotion_property_animation_repeat",
  "xrp_emotion_property_preload_red_vision",
  "xrp_emotion_property_control_permissions",
];

for (
  const propertyType of
  composableEmotionPropertyTypes
) {
  pythonGenerator.forBlock[
    propertyType
  ] = function () {
    /*
     * Property blocks are consumed by their parent Define
     * emotion with blocks container. They do not represent
     * executable Python statements on their own.
     */
    return "";
  };
}


pythonGenerator.forBlock['xrp_emotion_set'] = function (block) {
  setupEmotionStateTrackerGenerator();

  const emotionName =
    block.getFieldValue("EMOTION");

  ensureEmotionRegistration(
    emotionName
  );

  const forceReset =
    block.getFieldValue("FORCE_RESET");

  const code =
    `xrp_set_emotion("${emotionName}", ` +
    `force_reset=${forceReset})\n`;

  return code;
};


pythonGenerator.forBlock['xrp_emotion_current_is'] = function (block) {
  setupEmotionStateTrackerGenerator();

  const emotionName =
    block.getFieldValue("EMOTION");

  ensureEmotionRegistration(
    emotionName
  );

  const op =
    block.getFieldValue("OP");

  const code =
    op === "IS_NOT"
      ? `not xrp_current_emotion_is("${emotionName}")`
      : `xrp_current_emotion_is("${emotionName}")`;

  return [
    code,
    pythonGenerator.ORDER_LOGICAL_NOT,
  ];
};


pythonGenerator.forBlock[
  "xrp_emotion_run"
] = function () {
  ensureSafeEmotionUpdateGenerator();

  return "xrp_safe_emotion_update()\n";
};


pythonGenerator.forBlock[
  'xrp_emotion_controls_drivetrain'
] = function () {
  setupEmotionGenerator();

  const code =
    'emotion.is_overriding_drive()';

  return [
    code,
    pythonGenerator.ORDER_NONE,
  ];
};

//Web Server
var nextFunc = 0;
function getFuncName(){
  nextFunc++;
  return "func" + nextFunc;
}

pythonGenerator.forBlock['xrp_ws_forward_button'] = function (block) {
  pythonGenerator.definitions_['import_webserver'] = 'from XRPLib.webserver import Webserver';
  pythonGenerator.definitions_[`webserver_setup`] = `webserver = Webserver.get_default_webserver()`;
  var func = pythonGenerator.statementToCode(block, 'func');
  var funcName = getFuncName();
  var code = `\ndef ${funcName}():\n${func}\n`
  code += `webserver.registerForwardButton(${funcName})\n`
  return code;
};

pythonGenerator.forBlock['xrp_ws_back_button'] = function (block) {
  pythonGenerator.definitions_['import_webserver'] = 'from XRPLib.webserver import Webserver';
  pythonGenerator.definitions_[`webserver_setup`] = `webserver = Webserver.get_default_webserver()`;
  var func = pythonGenerator.statementToCode(block, 'func');
  var funcName = getFuncName();
  var code = `\ndef ${funcName}():\n${func}\n`
  code += `webserver.registerBackwardButton(${funcName})\n`
  return code;
};

pythonGenerator.forBlock['xrp_ws_left_button'] = function (block) {
  pythonGenerator.definitions_['import_webserver'] = 'from XRPLib.webserver import Webserver';
  pythonGenerator.definitions_[`webserver_setup`] = `webserver = Webserver.get_default_webserver()`;
  var func = pythonGenerator.statementToCode(block, 'func');
  var funcName = getFuncName();
  var code = `\ndef ${funcName}():\n${func}\n`
  code += `webserver.registerLeftButton(${funcName})\n`
  return code;
};

pythonGenerator.forBlock['xrp_ws_right_button'] = function (block) {
  pythonGenerator.definitions_['import_webserver'] = 'from XRPLib.webserver import Webserver';
  pythonGenerator.definitions_[`webserver_setup`] = `webserver = Webserver.get_default_webserver()`;
  var func = pythonGenerator.statementToCode(block, 'func');
  var funcName = getFuncName();
  var code = `\ndef ${funcName}():\n${func}\n`
  code += `webserver.registerRightButton(${funcName})\n`
  return code;
};

pythonGenerator.forBlock['xrp_ws_stop_button'] = function (block) {
  pythonGenerator.definitions_['import_webserver'] = 'from XRPLib.webserver import Webserver';
  pythonGenerator.definitions_[`webserver_setup`] = `webserver = Webserver.get_default_webserver()`;
  var func = pythonGenerator.statementToCode(block, 'func');
  var funcName = getFuncName();
  var code = `\ndef ${funcName}():\n${func}\n`
  code += `webserver.registerStopButton(${funcName})\n`
  return code;
};

pythonGenerator.forBlock['xrp_ws_add_button'] = function (block) {
  pythonGenerator.definitions_['import_webserver'] = 'from XRPLib.webserver import Webserver';
  pythonGenerator.definitions_[`webserver_setup`] = `webserver = Webserver.get_default_webserver()`;
  var name = block.getFieldValue("TEXT");
  var func = pythonGenerator.statementToCode(block, 'func');
  var funcName = getFuncName();
  var code = `\ndef ${funcName}():\n${func}\n`
  code += `webserver.add_button("${name}", ${funcName})\n`
  return code;
};

pythonGenerator.forBlock['xrp_ws_log_data'] = function (block) {
  pythonGenerator.definitions_['import_webserver'] = 'from XRPLib.webserver import Webserver';
  pythonGenerator.definitions_[`webserver_setup`] = `webserver = Webserver.get_default_webserver()`; 
  data = pythonGenerator.valueToCode(block, 'DATA', pythonGenerator.ORDER_ATOMIC);
  var label  = block.getInputTargetBlock("log_name").getFieldValue("TEXT");
  var code = `webserver.log_data("${label}", ${data})\n`
  return code;
};


pythonGenerator.forBlock['xrp_ws_connect_server'] = function (block) {
  pythonGenerator.definitions_['import_webserver'] = 'from XRPLib.webserver import Webserver';
  pythonGenerator.definitions_[`webserver_setup`] = `webserver = Webserver.get_default_webserver()`;
  var ssid = block.getInputTargetBlock("server_ssid").getFieldValue("TEXT");
  var pwd = block.getInputTargetBlock("server_pwd").getFieldValue("TEXT")
  var code = `webserver.connect_to_network(ssid="${ssid}", password="${pwd}")\nwebserver.start_server()\n`
  return code;
};

pythonGenerator.forBlock['xrp_ws_start_server'] = function (block) {
  pythonGenerator.definitions_['import_webserver'] = 'from XRPLib.webserver import Webserver';
  pythonGenerator.definitions_[`webserver_setup`] = `webserver = Webserver.get_default_webserver()`;
  var ssid = block.getInputTargetBlock("server_ssid").getFieldValue("TEXT");
  var pwd = block.getInputTargetBlock("server_pwd").getFieldValue("TEXT")
  var code = `webserver.start_network(ssid="${ssid}", password="${pwd}")\nwebserver.start_server()\n`
  return code;
};

// Dashboard

pythonGenerator.forBlock['xrp_dashboard_start_all'] = function (block) {
  pythonGenerator.definitions_['import_dashboard'] = 'from XRPLib.dashboard import Dashboard';
  pythonGenerator.definitions_[`dashboard_setup`] = `dashboard = Dashboard.get_default_dashboard()`;
  var code = `dashboard.start()\n`;
  return code;
};

pythonGenerator.forBlock['xrp_dashboard_stop_all'] = function (block) {
  pythonGenerator.definitions_['import_dashboard'] = 'from XRPLib.dashboard import Dashboard';
  pythonGenerator.definitions_[`dashboard_setup`] = `dashboard = Dashboard.get_default_dashboard()`;
  var code = `dashboard.stop()\n`;
  return code;
};

pythonGenerator.forBlock['xrp_dashboard_set_value'] = function (block) {
  pythonGenerator.definitions_['import_dashboard'] = 'from XRPLib.dashboard import Dashboard';
  pythonGenerator.definitions_[`dashboard_setup`] = `dashboard = Dashboard.get_default_dashboard()`;
  var name = block.getInputTargetBlock("var_name").getFieldValue("TEXT");
  var value = pythonGenerator.valueToCode(block, 'value', pythonGenerator.ORDER_ATOMIC);
  var code = `dashboard.set_value("${name}", ${value})\n`;
  return code;
};

pythonGenerator.forBlock['xrp_dashboard_get_value'] = function (block) {
  pythonGenerator.definitions_['import_dashboard'] = 'from XRPLib.dashboard import Dashboard';
  pythonGenerator.definitions_[`dashboard_setup`] = `dashboard = Dashboard.get_default_dashboard()`;
  var name = block.getInputTargetBlock("var_name").getFieldValue("TEXT");
  var code = `dashboard.get_value("${name}")`;
  return [code, pythonGenerator.ORDER_NONE];
};
// Gamepad

pythonGenerator.forBlock['xrp_gp_get_value'] = function (block) {
  pythonGenerator.definitions_['import_gamepad'] = 'from XRPLib.gamepad import *';
  pythonGenerator.definitions_[`gamepad_setup`] = `gp = Gamepad.get_default_gamepad()`;
  var value = block.getFieldValue("GPVALUE");
  var code = `gp.get_value(gp.${value})`;
  return [code , pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_gp_button_pressed'] = function (block) {
  pythonGenerator.definitions_['import_gamepad'] = 'from XRPLib.gamepad import *';
  pythonGenerator.definitions_[`gamepad_setup`] = `gp = Gamepad.get_default_gamepad()`;
  var value = block.getFieldValue("GPBUTTON");
  var code = `gp.is_button_pressed(gp.${value})`;
  return [code , pythonGenerator.ORDER_NONE];
};

//Logic
pythonGenerator.forBlock['xrp_sleep'] = function (block) {
  pythonGenerator.definitions_['import_time'] = 'import time';
  var number_time = pythonGenerator.valueToCode(block, 'TIME', pythonGenerator.ORDER_ATOMIC);
  var code = `time.sleep(${number_time})\n`;
  return code;
};

//Text
pythonGenerator.forBlock['comment'] = function(block) {
  var text = block.getFieldValue('TEXT');
  return '# ' + text + '\n';
};




function emotionPythonNumber(
  rawValue
) {
  const value = Number(rawValue);

  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(
    Number(value.toFixed(3))
  );
}


// ---------------------------------------------------------
// Individual motion step
// ---------------------------------------------------------

pythonGenerator.forBlock[
  "xrp_emotion_motion_step"
] = function (block) {
  const duration =
    Math.round(
      Number(
        block.getFieldValue(
          "DURATION"
        )
      )
    );

  const straight =
    emotionPythonNumber(
      block.getFieldValue(
        "STRAIGHT"
      )
    );

  const turn =
    emotionPythonNumber(
      block.getFieldValue(
        "TURN"
      )
    );

  return (
    `(${duration}, ` +
    `${straight}, ${turn}),\n`
  );
};

pythonGenerator.forBlock[
  "xrp_emotion_shake_motion"
] = function (block) {
  const duration =
    Math.max(
      10,
      Math.round(
        Number(
          block.getFieldValue(
            "DURATION"
          )
        )
      )
    );

  const straight =
    emotionPythonNumber(
      block.getFieldValue(
        "STRAIGHT"
      )
    );

  const turnStrength =
    Math.abs(
      Number(
        block.getFieldValue(
          "TURN_STRENGTH"
        )
      )
    );

  const turn =
    emotionPythonNumber(
      Math.min(
        1,
        turnStrength
      )
    );

  const oppositeTurn =
    turn === "0" ? turn : `-${turn}`;

  return (
    `(${duration}, ${straight}, ${turn}),\n` +
    `(${duration}, ${straight}, ${oppositeTurn}),\n`
  );
};


// ---------------------------------------------------------
// Complete emotion motion
// ---------------------------------------------------------

pythonGenerator.forBlock[
  "xrp_emotion_define_motion"
] = function (block) {
  setupEmotionMotionGenerator();

  const emotionName =
    block.getFieldValue(
      "EMOTION"
    );

  ensureEmotionRegistration(
    emotionName
  );

  const repeat =
    block.getFieldValue(
      "REPEAT"
    );

  const rawSteps =
    pythonGenerator
      .statementToCode(
        block,
        "STEPS"
      )
      .trim();

  if (!rawSteps) {
    return (
      "# Emotion motion ignored: " +
      "no motion steps were provided\n"
    );
  }

  const formattedSteps =
    rawSteps
      .split("\n")
      .filter(
        (line) =>
          line.trim().length > 0
      )
      .map(
        (line) =>
          "        " + line.trim()
      )
      .join("\n");

  return [
    "emotion.configure_motion(",
    `    "${emotionName}",`,
    "    steps=(",
    formattedSteps,
    "    ),",
    `    repeat=${repeat},`,
    ")",
    "",
  ].join("\n");
};

// ---------------------------------------------------------
// Configure emotion hardware
// ---------------------------------------------------------

pythonGenerator.forBlock[
  "xrp_emotion_configure_hardware"
] = function (block) {
  setupEmotionHardwareGenerator();

  const leftPort =
    block.getFieldValue(
      "DRIVE_LEFT_PORT"
    );

  const rightPort =
    block.getFieldValue(
      "DRIVE_RIGHT_PORT"
    );

  const invertLeft =
    emotionPythonBoolean(
      block.getFieldValue(
        "INVERT_LEFT"
      )
    );

  const invertRight =
    emotionPythonBoolean(
      block.getFieldValue(
        "INVERT_RIGHT"
      )
    );

  const auxMotor1Port =
    block.getFieldValue(
      "AUX_MOTOR_1_PORT"
    );

  const auxMotor2Port =
    block.getFieldValue(
      "AUX_MOTOR_2_PORT"
    );

  const invertAuxMotor1 =
    emotionPythonBoolean(
      block.getFieldValue(
        "INVERT_AUX_MOTOR_1"
      )
    );

  const invertAuxMotor2 =
    emotionPythonBoolean(
      block.getFieldValue(
        "INVERT_AUX_MOTOR_2"
      )
    );

  const useImu =
    emotionPythonBoolean(
      block.getFieldValue(
        "USE_IMU"
      )
    );

  const aux1Python =
    auxMotor1Port === "NONE"
      ? "None"
      : `"${auxMotor1Port}"`;

  const aux2Python =
    auxMotor2Port === "NONE"
      ? "None"
      : `"${auxMotor2Port}"`;

  pythonGenerator.definitions_[
    "emotion_hardware_setup"
  ] = [
    "emotionHardware = EmotionHardwareConfig(",

    `    drive_left_port="${leftPort}",`,
    `    drive_right_port="${rightPort}",`,

    `    invert_left=${invertLeft},`,
    `    invert_right=${invertRight},`,

    `    aux_motor_1_port=${aux1Python},`,
    `    aux_motor_2_port=${aux2Python},`,

    `    invert_aux_motor_1=${invertAuxMotor1},`,
    `    invert_aux_motor_2=${invertAuxMotor2},`,

    `    use_imu=${useImu},`,

    ")",

    "emotionDrive = " +
      "emotionHardware.create_drivetrain()",

    "emotionMotion = " +
      "EmotionMotionController(" +
      "emotionDrive)",

    "emotion.set_motion_controller(" +
      "emotionMotion)",
  ].join("\n");

  return "";
};

// ---------------------------------------------------------
// Voice commands generator
// Append this near the other pythonGenerator.forBlock entries.
// ---------------------------------------------------------

function setupVoiceCommandGenerator() {
  pythonGenerator.definitions_[
    "import_voice_command_receiver"
  ] =
    "from EmotionLib.voice_command_receiver import VoiceCommandReceiver";

  pythonGenerator.definitions_[
    "voice_command_setup"
  ] = [
    "voiceCommandReceiver = VoiceCommandReceiver()",
    "voiceCommand = None",
  ].join("\n");
}


pythonGenerator.forBlock[
  "xrp_voice_update"
] = function () {
  setupVoiceCommandGenerator();

  return (
    "voiceCommand = voiceCommandReceiver.poll()\n"
  );
};


pythonGenerator.forBlock[
  "xrp_voice_if_command"
] = function (block) {
  setupVoiceCommandGenerator();

  const command =
    block.getFieldValue(
      "COMMAND"
    );

  let branch =
    pythonGenerator.statementToCode(
      block,
      "DO"
    );

  if (!branch) {
    branch =
      pythonGenerator.INDENT +
      "pass\n";
  }

  return (
    `if voiceCommand == "${command}":\n` +
    branch
  );
};


pythonGenerator.forBlock[
  "xrp_voice_command_is"
] = function (block) {
  setupVoiceCommandGenerator();

  const command =
    block.getFieldValue(
      "COMMAND"
    );

  return [
    `voiceCommand == "${command}"`,
    pythonGenerator.ORDER_RELATIONAL,
  ];
};


pythonGenerator.forBlock[
  "xrp_voice_clear"
] = function () {
  setupVoiceCommandGenerator();

  return "voiceCommand = None\n";
};
