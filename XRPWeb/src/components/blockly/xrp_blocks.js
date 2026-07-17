import * as Blockly from 'blockly/core';

import {
  getConfigurableEmotionDropdownOptions,
  getPlayableEmotionDropdownOptions,
  getEmotionEntryByName,
  initializeEmotionBlocklyCatalog,
} from "./emotionCatalogBridge";

initializeEmotionBlocklyCatalog();
/*
    This file creates each Block item for Blockly.
    You can set and update the colors here based off the HUE value.
    You can also set tooltips and help Urls.
    Helpful Resource --> https://developers.google.com/blockly/guides/configure/web/appearance/themes
*/

// Individual Motors
Blockly.Blocks['xrp_motor_effort'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Motor:")
      .appendField(new Blockly.FieldDropdown([["Left", "1"], ["Right", "2"], ["3", "3"], ["4", "4"]]), "MOTOR")
      .appendField("Effort:");
    this.appendValueInput("effort")
      .setCheck("Number");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(352); // crimson
    this.setTooltip("Set the effort for the selected motor");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_motor_speed'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Motor:")
      .appendField(new Blockly.FieldDropdown([["Left", "1"], ["Right", "2"], ["3", "3"], ["4", "4"]]), "MOTOR")
      .appendField("Speed:");
    this.appendValueInput("speed")
      .setCheck("Number");
    this.appendDummyInput()
      .appendField("RPM")
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(352); // crimson
    this.setTooltip("Set the speed in rotations per minute(RPM) for the selected motor");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_motor_direction'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Motor:")
      .appendField(new Blockly.FieldDropdown([["Left", "1"], ["Right", "2"], ["3", "3"], ["4", "4"]]), "MOTOR")
      .appendField("Direction:")
      .appendField(new Blockly.FieldDropdown([["Reverse", "True"], ["Forward", "False"]]), "DIRECTION");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(352); // crimson
    this.setTooltip("Set the default direction of the selected motor");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_motor_get_speed'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Motor:")
      .appendField(new Blockly.FieldDropdown([["Left", "1"], ["Right", "2"], ["3", "3"], ["4", "4"]]), "MOTOR")
      .appendField("Speed");
    this.setOutput(true, null);
    this.setColour(352); // crimson
    this.setTooltip("Get the speed of the selected motor");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_motor_get_position'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Motor:")
      .appendField(new Blockly.FieldDropdown([["Left", "1"], ["Right", "2"], ["3", "3"], ["4", "4"]]), "MOTOR")
      .appendField("Position");
    this.setOutput(true, null);
    this.setColour(352); // crimson
    this.setTooltip("Get the position (number of revolutions) of the selected motor since the last reset");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_motor_get_count'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Motor:")
      .appendField(new Blockly.FieldDropdown([["Left", "1"], ["Right", "2"], ["3", "3"], ["4", "4"]]), "MOTOR")
      .appendField("Encoder count");
    this.setOutput(true, null);
    this.setColour(352); // crimson
    this.setTooltip("Get the number of encoder count of the selected motor since the last reset");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_motor_reset_position'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Motor:")
      .appendField(new Blockly.FieldDropdown([["Left", "1"], ["Right", "2"], ["3", "3"], ["4", "4"]]), "MOTOR")
      .appendField("Reset encoder")
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(352); // crimson
    this.setTooltip("Reset the position and count for the selected motor");
    this.setHelpUrl("");
  }
};

// DriveTrain
Blockly.Blocks['xrp_straight_effort'] = {
  init: function () {
    this.appendValueInput("dist")
      .setCheck("Number")
      .appendField("Straight")
      .appendField("cm:");
    this.appendValueInput("effort")
      .setCheck("Number")
      .appendField("Effort:");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(10); // orange
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_turn_effort'] = {
  init: function () {
    this.appendValueInput("degrees")
      .setCheck("Number")
      .appendField("Turn  Deg:");
    this.appendValueInput("effort")
      .setCheck("Number")
      .appendField("Effort:");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(10); // orange
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_seteffort'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Set effort");
    this.appendValueInput("LEFT")
      .setCheck("Number")
      .appendField("Left:");
    this.appendValueInput("RIGHT")
      .setCheck("Number")
      .appendField("Right:");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(10); // orange
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_speed'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Set speed");
    this.appendValueInput("LEFT")
      .setCheck(null)
      .appendField("Left:");
    this.appendValueInput("RIGHT")
      .setCheck(null)
      .appendField("cm/s")
      .appendField("Right:");
    this.appendDummyInput()
      .appendField("cm/s");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(10); // orange
    this.setTooltip("Set the speed in RPM for the motors");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_arcade'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Arcade");
    this.appendValueInput("STRAIGHT")
      .setCheck("Number")
      .appendField("Straight:");
    this.appendValueInput("TURN")
      .setCheck("Number")
      .appendField("Turn:");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(10); // orange
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_arcade_for_seconds'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Drive for seconds");
    this.appendValueInput("STRAIGHT")
      .setCheck("Number")
      .appendField("Straight:");
    this.appendValueInput("TURN")
      .setCheck("Number")
      .appendField("Turn:");
    this.appendValueInput("SECONDS")
      .setCheck("Number")
      .appendField("Seconds:");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(10); // orange
    this.setTooltip(
      "Drive using arcade values for a fixed amount of time, " +
      "keep emotion outputs updating, then stop the motors automatically."
    );
    this.setHelpUrl("");
  }
};


Blockly.Blocks['xrp_stop_motors'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Stop motors");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(10); // orange
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_resetencoders'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Reset encoders");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(10); // orange
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_getleftencoder'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Left encoder");
    this.setOutput(true, null);
    this.setColour(10); // orange
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_getrightencoder'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Right encoder");
    this.setOutput(true, null);
    this.setColour(10); // orange
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

// Servo
let servoNames = [["1", "1"], ["2", "2"]];
Blockly.Blocks['xrp_servo_deg'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('Servo:')
      .appendField(new Blockly.FieldDropdown(servoNames), "SERVO")
      .appendField('Deg:');
    this.appendValueInput("degrees")
      .setCheck("Number")
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(300); // light purple
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

// Sensors - Sonar
Blockly.Blocks['xrp_getsonardist'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Sonar distance");
    this.setOutput(true, null);
    this.setColour(90); // soft green
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

//Sensors - Reflectance
Blockly.Blocks['xrp_l_refl'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Left reflectance");
    this.setOutput(true, null);
    this.setColour(90); // soft green
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_r_refl'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Right reflectance");
    this.setOutput(true, null);
    this.setColour(90); // soft green
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_m_refl'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Middle reflectance");
    this.setOutput(true, null);
    this.setColour(90); // soft green
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

//Sensors - Gyro
Blockly.Blocks['xrp_yaw'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Yaw");
    this.setOutput(true, null);
    this.setColour(90); // soft green
    this.setTooltip("");
    this.setHelpUrl("The amount the robot has turned left or right from center");
  }
};

Blockly.Blocks['xrp_roll'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Roll");
    this.setOutput(true, null);
    this.setColour(90); // soft green
    this.setTooltip("The amount of tipping to the left or right");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_pitch'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Pitch");
    this.setOutput(true, null);
    this.setColour(90); // soft green
    this.setTooltip("");
    this.setHelpUrl("The amount the front of the robot is tilting up or down");
  }
};

//Sensors - Accelerometer
Blockly.Blocks['xrp_acc_x'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Acc_x");
    this.setOutput(true, null);
    this.setColour(90); // soft green
    this.setTooltip("");
    this.setHelpUrl("The acceleration in the X direction");
  }
};

Blockly.Blocks['xrp_acc_y'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Acc_y");
    this.setOutput(true, null);
    this.setColour(90); // soft green
    this.setTooltip("");
    this.setHelpUrl("The acceleration in the Y direction");
  }
};

Blockly.Blocks['xrp_acc_z'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Acc_z");
    this.setOutput(true, null);
    this.setColour(90); // soft green
    this.setTooltip("");
    this.setHelpUrl("The acceleration in the Z direction");
  }
};

//Control Board
Blockly.Blocks['xrp_led_on'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("LED on");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(150); // darker teal
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_led_off'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("LED off");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(150); // darker teal
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

// "User Button"
Blockly.Blocks['xrp_button_pressed'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("User button");
    this.setOutput(true, null);
    this.setColour(150); // darker teal
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

// "Wait for Button Press"
Blockly.Blocks['xrp_wait_for_button_press'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Wait for button press");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(150); // darker teal
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

//Web Server
Blockly.Blocks['xrp_ws_forward_button'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Web forward button")
    this.appendStatementInput('func')
      .appendField('Function:');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190); // turquoise
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_ws_back_button'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Web back button")
    this.appendStatementInput('func')
      .appendField('Function:');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190); // turquoise
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_ws_left_button'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Web left button")
    this.appendStatementInput('func')
      .appendField('Function:'); this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190); // turquoise
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_ws_right_button'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Web right button")
    this.appendStatementInput('func')
      .appendField('Function:'); this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190); // turquoise
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_ws_stop_button'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Web stop button")
    this.appendStatementInput('func')
      .appendField('Function:'); this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190); // turquoise
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_ws_add_button'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Web add button  Name:")
      .appendField(new Blockly.FieldTextInput("name"), "TEXT")
    this.appendStatementInput('func')
      .appendField('Function:');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190); // turquoise
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_ws_log_data'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Web log data");
    this.appendValueInput("log_name")
      .appendField("Label:")
      .setCheck("String");
    this.appendValueInput("DATA")
      .appendField("Data:");
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190); // turquoise
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_ws_start_server'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Start web server");
    this.appendValueInput("server_ssid")
      .appendField("Name:")
      .setCheck("String");
    this.appendValueInput("server_pwd")
      .appendField("Password:")
      .setCheck("String");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190); // turquoise
    this.setTooltip("Starts a web server from the XRP");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_ws_connect_server'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Connect web server");
    this.appendValueInput("server_ssid")
      .appendField("Name:")
      .setCheck("String");
    this.appendValueInput("server_pwd")
      .appendField("Password:")
      .setCheck("String");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(190); // turquoise
    this.setTooltip("Connects the XRP web server to an existing network");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_gp_get_value'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Joystick:")
      .appendField(new Blockly.FieldDropdown([["X1", "X1"], ["X2", "X2"], ["Y1", "Y1"], ["Y2", "Y2"]]), "GPVALUE")
    this.setOutput(true, null);
    this.setColour("#ff9248"); // crimson
    this.setTooltip("Get the value of a gamepad joystick");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_gp_button_pressed'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Button:")
      .appendField(new Blockly.FieldDropdown([["A", "BUTTON_A"], ["B", "BUTTON_B"], ["X", "BUTTON_X"], ["Y", "BUTTON_Y"], ["Bumper Left", "BUMPER_L"], ["Bumper Right", "BUMPER_R"],
      ["Trigger Left", "TRIGGER_L"],["Trigger Right", "TRIGGER_R"],["Back", "BACK"], ["Start", "START"], 
      ["D-PAD Up", "DPAD_UP"],["D-PAD Down", "DPAD_DN"],["D-PAD Left", "DPAD_L"],["D-PAD Right", "DPAD_R"]]), "GPBUTTON")
      .appendField("Pressed")
    this.setOutput(true, null);
    this.setColour("#ff9248"); // crimson
    this.setTooltip("Check to see if a gamepad button is pressed");
    this.setHelpUrl("");
  }
};

// ---------------------------------------------------------
// Emotions
// ---------------------------------------------------------

Blockly.Blocks[
  "xrp_emotion_configure_red_vision"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField(
        "Use Red Vision display"
      )
      .appendField(
        new Blockly.FieldDropdown([
          [
            "Yes",
            "True",
          ],
          [
            "No",
            "False",
          ],
        ]),
        "ENABLED"
      );

    this.setPreviousStatement(
      true,
      null
    );

    this.setNextStatement(
      true,
      null
    );

    this.setColour(
      "#00a6a6"
    );

    this.setTooltip(
      "Globally enable or disable the " +
      "physical Red Vision display. " +
      "When disabled, no display images " +
      "are loaded into RAM."
    );

    this.setHelpUrl("");
  },
};

Blockly.Blocks['xrp_emotion_set'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Set emotion")
      .appendField(
        new Blockly.FieldDropdown(
            getPlayableEmotionDropdownOptions
          ),
        "EMOTION"
      )
      .appendField("force reset")
      .appendField(
        new Blockly.FieldDropdown([
          ["No", "False"],
          ["Yes", "True"],
        ]),
        "FORCE_RESET"
      );

    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#00a6a6");
    this.setTooltip(
      "Request an emotion. The change is applied by the Run emotion block."
    );
    this.setHelpUrl("");
  },
};


Blockly.Blocks['xrp_emotion_current_is'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Current emotion")
      .appendField(
        new Blockly.FieldDropdown([
          ["is", "IS"],
          ["is not", "IS_NOT"],
        ]),
        "OP"
      )
      .appendField(
        new Blockly.FieldDropdown(
          getPlayableEmotionDropdownOptions
        ),
        "EMOTION"
      );

    this.setOutput(true, "Boolean");
    this.setColour("#00a6a6");
    this.setTooltip(
      "Checks the last emotion requested by a Set emotion block. Useful to avoid setting the same emotion repeatedly."
    );
    this.setHelpUrl("");
  },
};


Blockly.Blocks['xrp_emotion_run'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Run emotion");

    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#00a6a6");
    this.setTooltip(
      "Apply pending emotion changes and update motion, dashboard, sound, and Red Vision display. Use repeatedly inside a loop."
    );
    this.setHelpUrl("");
  },
};


Blockly.Blocks['xrp_emotion_controls_drivetrain'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Emotion controls drivetrain?");

    this.setOutput(true, "Boolean");
    this.setColour("#00a6a6");
    this.setTooltip(
      "Return true while an emotion temporarily owns the drivetrain."
    );
    this.setHelpUrl("");
  },
};

// Logic
Blockly.Blocks['xrp_sleep'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Sleep:")
    this.appendValueInput("TIME")
      .setCheck("Number");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200); // slate blue
    this.setTooltip("");
    this.setHelpUrl("");
  }
};

// Dashboard
Blockly.Blocks['xrp_dashboard_start_all'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Dashboard start all");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#0080ff"); // bright blue
    this.setTooltip("Start all default dashboard variables");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_dashboard_stop_all'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Dashboard stop all");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#0080ff"); // bright blue
    this.setTooltip("Stop all default dashboard variables");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_dashboard_set_value'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Dashboard set value");
    this.appendValueInput("var_name")
      .setCheck("String")
      .appendField("Name:");
    this.appendValueInput("value")
      .setCheck("Number")
      .appendField("Value:");
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#0080ff"); // bright blue
    this.setTooltip("Set a dashboard variable value");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['xrp_dashboard_get_value'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Dashboard get value");
    this.appendValueInput("var_name")
      .setCheck("String")
      .appendField("Name:");
    this.setInputsInline(false);
    this.setOutput(true, "Number");
    this.setColour("#0080ff"); // bright blue
    this.setTooltip("Get a dashboard variable value");
    this.setHelpUrl("");
  }
};

// Text
Blockly.Blocks['comment'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Comment")
        .appendField(new Blockly.FieldTextInput(""), "TEXT");
    this.setColour(60); // yellow
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip("Add a comment to your code.");
    this.setHelpUrl("");
  }
};

// OTHER BLOCK COLORS - These colors can be found in the xrp_blockly_toolbox1.js file
// BLOCK TYPE --> COLOR
// Loops --> grass green
// Math --> indigo
// Text --> sea foam green
// Lists --> eggplant purple
// Variables --> grey
// Functions --> medium purple


// ---------------------------------------------------------
// Advanced emotion definition block
// ---------------------------------------------------------

function validateEmotionFrameSubset(value) {
  const text = String(value).trim();

  if (text === "") {
    return "";
  }

  const parts = text
    .split(",")
    .map((item) => item.trim());

  if (
    parts.length === 0 ||
    parts.length > 8
  ) {
    return null;
  }

  const numbers = [];

  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return null;
    }

    numbers.push(Number(part));
  }

  /*
   * Migrate old sequences automatically:
   *
   * Old format:
   * 0,1,2,1
   *
   * New student-friendly format:
   * 1,2,3,2
   */
  const isLegacyZeroBased =
    numbers.some(
      (frameNumber) =>
        frameNumber === 0
    ) &&
    numbers.every(
      (frameNumber) =>
        frameNumber >= 0 &&
        frameNumber <= 15
    );

  if (isLegacyZeroBased) {
    return numbers
      .map(
        (frameNumber) =>
          frameNumber + 1
      )
      .join(",");
  }

  /*
   * Students use frame numbers 1 through 16.
   * Internally, the generator converts them to
   * indexes 0 through 15.
   */
  const isValidOneBased =
    numbers.every(
      (frameNumber) =>
        frameNumber >= 1 &&
        frameNumber <= 16
    );

  if (!isValidOneBased) {
    return null;
  }

  return numbers.join(",");
}

const DEFAULT_MIN_SWITCH_TIME_MS = 500;


function getRepeatModeDisplayName(
  repeatMode
) {
  switch (repeatMode) {
    case "once":
      return "Play once";

    case "count":
      return "Fixed count";

    case "ping_pong":
      return "Forward and backward";

    case "loop":
    default:
      return "Loop continuously";
  }
}


function setEmotionFieldEnabled(
  block,
  fieldName,
  enabled
) {
  const field =
    block.getField(fieldName);

  if (!field) {
    return;
  }

  field.setEnabled(enabled);
}


function updateEmotionDefineInputs(
  block
) {
  const emotionName =
    block.getFieldValue(
      "EMOTION"
    );

  const catalogEntry =
    getEmotionEntryByName(
      emotionName
    );

  const defaultFps =
    catalogEntry?.defaultFps ?? 4;

  const defaultRepeatMode =
    catalogEntry?.repeatMode ??
    "loop";


  // ---------------------------------------------
  // Animation speed
  // ---------------------------------------------

  const customFps =
    block.getFieldValue(
      "FPS_MODE"
    ) === "CUSTOM";

  const fpsStatusField =
    block.getField(
      "FPS_VALUE_STATUS"
    );

  const fpsValueField =
    block.getField("FPS");

  fpsStatusField?.setValue(
    customFps
      ? "Custom:"
      : "Default:"
  );

  if (
    !customFps &&
    fpsValueField
  ) {
    fpsValueField.setValue(
      String(defaultFps)
    );
  }

  setEmotionFieldEnabled(
    block,
    "FPS",
    customFps
  );


  // ---------------------------------------------
  // Minimum switching time
  // ---------------------------------------------

  const customMinimumTime =
    block.getFieldValue(
      "MIN_TIME_MODE"
    ) === "CUSTOM";

  const minimumTimeStatusField =
    block.getField(
      "MIN_TIME_VALUE_STATUS"
    );

  const minimumTimeField =
    block.getField(
      "MIN_TIME"
    );

  minimumTimeStatusField?.setValue(
    customMinimumTime
      ? "Custom:"
      : "Default:"
  );

  if (
    !customMinimumTime &&
    minimumTimeField
  ) {
    minimumTimeField.setValue(
      String(
        DEFAULT_MIN_SWITCH_TIME_MS
      )
    );
  }

  setEmotionFieldEnabled(
    block,
    "MIN_TIME",
    customMinimumTime
  );


  // ---------------------------------------------
  // Frame sequence
  // ---------------------------------------------

  const customFrames =
    block.getFieldValue(
      "FRAME_MODE"
    ) === "CUSTOM";

  block
    .getInput(
      "FRAME_DEFAULT_INPUT"
    )
    ?.setVisible(!customFrames);

  block
    .getInput(
      "FRAME_SEQUENCE_INPUT"
    )
    ?.setVisible(customFrames);


  // ---------------------------------------------
  // Repeat configuration
  // ---------------------------------------------

  const repeatMode =
    block.getFieldValue(
      "REPEAT_MODE"
    );

  const usingDefaultRepeat =
    repeatMode === "DEFAULT";

  const usingRepeatCount =
    repeatMode === "count";

  const repeatDefaultField =
    block.getField(
      "REPEAT_DEFAULT_LABEL"
    );

  repeatDefaultField?.setValue(
    `Default: ${
      getRepeatModeDisplayName(
        defaultRepeatMode
      )
    }`
  );

  block
    .getInput(
      "REPEAT_DEFAULT_INPUT"
    )
    ?.setVisible(
      usingDefaultRepeat
    );

  block
    .getInput(
      "REPEAT_COUNT_INPUT"
    )
    ?.setVisible(
      usingRepeatCount
    );


  if (block.rendered) {
    block.render();
  }
}


Blockly.Blocks[
  "xrp_emotion_define"
] = {
  init: function () {
    // ---------------------------------------------
    // Emotion
    // ---------------------------------------------

    this.appendDummyInput(
      "EMOTION_INPUT"
    )
      .appendField(
        "Define emotion"
      )
      .appendField(
        new Blockly.FieldDropdown(
          getConfigurableEmotionDropdownOptions
        ),
        "EMOTION"
      );


    // ---------------------------------------------
    // Animation speed
    // ---------------------------------------------

    this.appendDummyInput(
      "FPS_MODE_INPUT"
    )
      .appendField(
        "animation speed"
      )
      .appendField(
        new Blockly.FieldDropdown([
          [
            "Use emotion default",
            "DEFAULT",
          ],
          [
            "Choose speed",
            "CUSTOM",
          ],
        ]),
        "FPS_MODE"
      );

    this.appendDummyInput(
      "FPS_VALUE_INPUT"
    )
      .appendField(
        new Blockly
          .FieldLabelSerializable(
            "Default:",
            "emotion-parameter-status"
          ),
        "FPS_VALUE_STATUS"
      )
      .appendField(
        new Blockly.FieldNumber(
          4,
          1,
          60,
          1
        ),
        "FPS"
      )
      .appendField("FPS");


    // ---------------------------------------------
    // Minimum switching time
    // ---------------------------------------------

    this.appendDummyInput(
      "MIN_TIME_MODE_INPUT"
    )
      .appendField(
        "minimum time before switching"
      )
      .appendField(
        new Blockly.FieldDropdown([
          [
            "Use emotion default",
            "DEFAULT",
          ],
          [
            "Choose time",
            "CUSTOM",
          ],
        ]),
        "MIN_TIME_MODE"
      );

    this.appendDummyInput(
      "MIN_TIME_VALUE_INPUT"
    )
      .appendField(
        new Blockly
          .FieldLabelSerializable(
            "Default:",
            "emotion-parameter-status"
          ),
        "MIN_TIME_VALUE_STATUS"
      )
      .appendField(
        new Blockly.FieldNumber(
          DEFAULT_MIN_SWITCH_TIME_MS,
          0,
          60000,
          50
        ),
        "MIN_TIME"
      )
      .appendField("ms");


    // ---------------------------------------------
    // Frame sequence
    // ---------------------------------------------

    this.appendDummyInput(
      "FRAME_MODE_INPUT"
    )
      .appendField(
        "animation frames"
      )
      .appendField(
        new Blockly.FieldDropdown([
          [
            "Play all frames",
            "ALL",
          ],
          [
            "Choose frame order",
            "CUSTOM",
          ],
        ]),
        "FRAME_MODE"
      );

    this.appendDummyInput(
      "FRAME_DEFAULT_INPUT"
    )
      .appendField(
        new Blockly
          .FieldLabelSerializable(
            "Default: All frames",
            "emotion-parameter-status"
          )
      );

    this.appendDummyInput(
      "FRAME_SEQUENCE_INPUT"
    )
      .appendField(
        new Blockly
          .FieldLabelSerializable(
            "Custom:",
            "emotion-parameter-status"
          )
      )
      .appendField(
        new Blockly.FieldTextInput(
          "1,2,3,2",
          validateEmotionFrameSubset
        ),
        "FRAME_SUBSET"
      )
      .appendField(
        "example: 1,2,3,2"
      );


    // ---------------------------------------------
    // Visual repetition
    // ---------------------------------------------

    this.appendDummyInput(
      "REPEAT_MODE_INPUT"
    )
      .appendField(
        "animation repeat"
      )
      .appendField(
        new Blockly.FieldDropdown([
          [
            "Use emotion default",
            "DEFAULT",
          ],
          [
            "Play once",
            "once",
          ],
          [
            "Loop continuously",
            "loop",
          ],
          [
            "Repeat a number of times",
            "count",
          ],
          [
            "Forward and backward",
            "ping_pong",
          ],
        ]),
        "REPEAT_MODE"
      );

    this.appendDummyInput(
      "REPEAT_DEFAULT_INPUT"
    )
      .appendField(
        new Blockly
          .FieldLabelSerializable(
            "Default: Loop continuously",
            "emotion-parameter-status"
          ),
        "REPEAT_DEFAULT_LABEL"
      );

    this.appendDummyInput(
      "REPEAT_COUNT_INPUT"
    )
      .appendField(
        new Blockly
          .FieldLabelSerializable(
            "Custom:",
            "emotion-parameter-status"
          )
      )
      .appendField(
        new Blockly.FieldNumber(
          3,
          1,
          100,
          1
        ),
        "REPEAT_COUNT"
      )
      .appendField("times");

          // ---------------------------------------------
    // Red Vision cache
    // ---------------------------------------------

    this.appendDummyInput(
      "RED_VISION_CACHE_INPUT"
    )
      .appendField(
        "preload on Red Vision"
      )
      .appendField(
        new Blockly.FieldDropdown([
          [
            "No",
            "FALSE",
          ],
          [
            "Yes",
            "TRUE",
          ],
        ]),
        "PRELOAD_RED_VISION"
      );


    // ---------------------------------------------
    // Output permissions
    // ---------------------------------------------

    this.appendDummyInput(
      "OVERRIDES_INPUT"
    )
      .appendField(
        "allow emotion to control"
      )
      .appendField("dashboard")
      .appendField(
        new Blockly.FieldCheckbox(
          "TRUE"
        ),
        "OVERRIDE_DASHBOARD"
      )
      .appendField("drivetrain")
      .appendField(
        new Blockly.FieldCheckbox(
          "FALSE"
        ),
        "OVERRIDE_DRIVETRAIN"
      )
      .appendField("LED")
      .appendField(
        new Blockly.FieldCheckbox(
          "FALSE"
        ),
        "OVERRIDE_LED"
      );


    this.setPreviousStatement(
      true,
      null
    );

    this.setNextStatement(
      true,
      null
    );

    this.setInputsInline(false);

    this.setColour("#00a6a6");

    this.setTooltip(
      "Configure how an emotion looks, " +
      "repeats and interacts with the robot."
    );

    this.setHelpUrl("");


    // ---------------------------------------------
    // Dynamic behavior
    // ---------------------------------------------

    this.setOnChange(function (
      event
    ) {
      if (
        !this.workspace ||
        this.isInFlyout ||
        !event
      ) {
        return;
      }

      const relevantFields = [
        "EMOTION",
        "FPS_MODE",
        "MIN_TIME_MODE",
        "FRAME_MODE",
        "REPEAT_MODE",
      ];

      const relevantChange =
        event.type ===
          Blockly.Events.BLOCK_CHANGE &&
        event.blockId === this.id &&
        event.element === "field" &&
        relevantFields.includes(
          event.name
        );

      const workspaceLoaded =
        event.type ===
        Blockly.Events.FINISHED_LOADING;

      if (
        relevantChange ||
        workspaceLoaded
      ) {
        updateEmotionDefineInputs(
          this
        );
      }
    });


    window.setTimeout(
      () => {
        updateEmotionDefineInputs(
          this
        );
      },
      0
    );
  },
};


// ---------------------------------------------------------
// Composable emotion definition blocks
// ---------------------------------------------------------

const EMOTION_DEFINITION_PROPERTY_TYPE =
  "EmotionDefinitionProperty";

const EMOTION_DEFINITION_PROPERTY_BLOCKS =
  new Set([
    "xrp_emotion_property_animation_speed",
    "xrp_emotion_property_minimum_switch_time",
    "xrp_emotion_property_animation_frames",
    "xrp_emotion_property_animation_repeat",
    "xrp_emotion_property_preload_red_vision",
    "xrp_emotion_property_control_permissions",
  ]);


function configureEmotionPropertyConnections(
  block
) {
  block.setPreviousStatement(
    true,
    EMOTION_DEFINITION_PROPERTY_TYPE
  );

  block.setNextStatement(
    true,
    EMOTION_DEFINITION_PROPERTY_TYPE
  );

  block.setColour("#00a6a6");
  block.setHelpUrl("");
}


function enforceEmotionPropertyBlocks(
  block
) {
  let currentBlock =
    block.getInputTargetBlock(
      "PROPERTIES"
    );

  while (currentBlock) {
    if (
      !EMOTION_DEFINITION_PROPERTY_BLOCKS
        .has(currentBlock.type)
    ) {
      currentBlock.setWarningText(
        "Only emotion setting blocks can " +
          "be placed inside this block."
      );

      /*
       * Most regular Blockly statement blocks use an
       * unrestricted connection. Blockly treats that as a
       * wildcard, so the typed statement input alone cannot
       * reject every unrelated block. Unplugging it here
       * keeps this container exclusive to emotion settings.
       */
      currentBlock.unplug(true);
      return;
    }

    currentBlock.setWarningText(null);
    currentBlock =
      currentBlock.getNextBlock();
  }
}


function updateComposableEmotionFramesBlock(
  block
) {
  const customFrames =
    block.getFieldValue(
      "FRAME_MODE"
    ) === "CUSTOM";

  block
    .getInput("FRAME_SEQUENCE_INPUT")
    ?.setVisible(customFrames);

  if (block.rendered) {
    block.render();
  }
}


function updateComposableEmotionRepeatBlock(
  block
) {
  const usingRepeatCount =
    block.getFieldValue(
      "REPEAT_MODE"
    ) === "count";

  block
    .getInput("REPEAT_COUNT_INPUT")
    ?.setVisible(usingRepeatCount);

  if (block.rendered) {
    block.render();
  }
}


Blockly.Blocks[
  "xrp_emotion_define_composable"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField(
        "Define emotion with blocks"
      )
      .appendField(
        new Blockly.FieldDropdown(
          getConfigurableEmotionDropdownOptions
        ),
        "EMOTION"
      );

    this.appendStatementInput(
      "PROPERTIES"
    )
      .setCheck(
        EMOTION_DEFINITION_PROPERTY_TYPE
      )
      .appendField(
        "emotion settings"
      );

    this.setPreviousStatement(
      true,
      null
    );

    this.setNextStatement(
      true,
      null
    );

    this.setColour("#00a6a6");

    this.setTooltip(
      "Define an emotion by adding only the " +
        "settings you want to customize. " +
        "Missing settings use safe defaults."
    );

    this.setHelpUrl("");

    this.setOnChange(function (event) {
      if (
        !this.workspace ||
        this.isInFlyout ||
        !event
      ) {
        return;
      }

      const shouldValidate =
        event.type ===
          Blockly.Events.BLOCK_MOVE ||
        event.type ===
          Blockly.Events.FINISHED_LOADING;

      if (shouldValidate) {
        enforceEmotionPropertyBlocks(
          this
        );
      }
    });
  },
};


Blockly.Blocks[
  "xrp_emotion_property_animation_speed"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField("animation speed")
      .appendField(
        new Blockly.FieldNumber(
          4,
          1,
          60,
          1
        ),
        "FPS"
      )
      .appendField("FPS");

    configureEmotionPropertyConnections(
      this
    );

    this.setTooltip(
      "Choose the animation playback speed."
    );
  },
};


Blockly.Blocks[
  "xrp_emotion_property_minimum_switch_time"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField(
        "minimum time before switching"
      )
      .appendField(
        new Blockly.FieldNumber(
          DEFAULT_MIN_SWITCH_TIME_MS,
          0,
          60000,
          50
        ),
        "MIN_TIME"
      )
      .appendField("ms");

    configureEmotionPropertyConnections(
      this
    );

    this.setTooltip(
      "Choose how long the emotion must remain " +
        "active before it can switch."
    );
  },
};


Blockly.Blocks[
  "xrp_emotion_property_animation_frames"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField("animation frames")
      .appendField(
        new Blockly.FieldDropdown([
          [
            "Play all frames",
            "ALL",
          ],
          [
            "Choose frame order",
            "CUSTOM",
          ],
        ]),
        "FRAME_MODE"
      );

    this.appendDummyInput(
      "FRAME_SEQUENCE_INPUT"
    )
      .appendField("frame order")
      .appendField(
        new Blockly.FieldTextInput(
          "1,2,3,2",
          validateEmotionFrameSubset
        ),
        "FRAME_SUBSET"
      );

    configureEmotionPropertyConnections(
      this
    );

    this.setTooltip(
      "Play every frame or choose a custom " +
        "frame order."
    );

    this.setOnChange(function (event) {
      if (
        !this.workspace ||
        this.isInFlyout ||
        !event
      ) {
        return;
      }

      const relevantChange =
        event.type ===
          Blockly.Events.BLOCK_CHANGE &&
        event.blockId === this.id &&
        event.element === "field" &&
        event.name === "FRAME_MODE";

      if (
        relevantChange ||
        event.type ===
          Blockly.Events.FINISHED_LOADING
      ) {
        updateComposableEmotionFramesBlock(
          this
        );
      }
    });

    window.setTimeout(
      () => {
        updateComposableEmotionFramesBlock(
          this
        );
      },
      0
    );
  },
};


Blockly.Blocks[
  "xrp_emotion_property_animation_repeat"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField("animation repeat")
      .appendField(
        new Blockly.FieldDropdown([
          [
            "Play once",
            "once",
          ],
          [
            "Loop continuously",
            "loop",
          ],
          [
            "Repeat a number of times",
            "count",
          ],
          [
            "Forward and backward",
            "ping_pong",
          ],
        ]),
        "REPEAT_MODE"
      );

    this.appendDummyInput(
      "REPEAT_COUNT_INPUT"
    )
      .appendField("repeat")
      .appendField(
        new Blockly.FieldNumber(
          3,
          1,
          100,
          1
        ),
        "REPEAT_COUNT"
      )
      .appendField("times");

    configureEmotionPropertyConnections(
      this
    );

    this.setTooltip(
      "Choose how the emotion animation repeats."
    );

    this.setOnChange(function (event) {
      if (
        !this.workspace ||
        this.isInFlyout ||
        !event
      ) {
        return;
      }

      const relevantChange =
        event.type ===
          Blockly.Events.BLOCK_CHANGE &&
        event.blockId === this.id &&
        event.element === "field" &&
        event.name === "REPEAT_MODE";

      if (
        relevantChange ||
        event.type ===
          Blockly.Events.FINISHED_LOADING
      ) {
        updateComposableEmotionRepeatBlock(
          this
        );
      }
    });

    window.setTimeout(
      () => {
        updateComposableEmotionRepeatBlock(
          this
        );
      },
      0
    );
  },
};


Blockly.Blocks[
  "xrp_emotion_property_preload_red_vision"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField(
        "preload on Red Vision"
      )
      .appendField(
        new Blockly.FieldDropdown([
          ["No", "FALSE"],
          ["Yes", "TRUE"],
        ]),
        "PRELOAD_RED_VISION"
      );

    configureEmotionPropertyConnections(
      this
    );

    this.setTooltip(
      "Choose whether Red Vision loads this " +
        "emotion into its cache at startup."
    );
  },
};


Blockly.Blocks[
  "xrp_emotion_property_control_permissions"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField(
        "allow emotion to control"
      )
      .appendField("dashboard")
      .appendField(
        new Blockly.FieldCheckbox(
          "TRUE"
        ),
        "OVERRIDE_DASHBOARD"
      )
      .appendField("drivetrain")
      .appendField(
        new Blockly.FieldCheckbox(
          "TRUE"
        ),
        "OVERRIDE_DRIVETRAIN"
      )
      .appendField("LED")
      .appendField(
        new Blockly.FieldCheckbox(
          "FALSE"
        ),
        "OVERRIDE_LED"
      );

    configureEmotionPropertyConnections(
      this
    );

    this.setTooltip(
      "Choose which robot outputs this emotion " +
        "is allowed to control."
    );
  },
};

// ---------------------------------------------------------
// Emotion motion blocks
// ---------------------------------------------------------

Blockly.Blocks[
  "xrp_emotion_define_motion"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField(
        "Define emotion motion"
      )
      .appendField(
        new Blockly.FieldDropdown(
            getConfigurableEmotionDropdownOptions
          ),
        "EMOTION"
      )
      .appendField("repeat")
      .appendField(
        new Blockly.FieldDropdown([
          ["No", "False"],
          ["Yes", "True"],
        ]),
        "REPEAT"
      );

    this.appendStatementInput(
      "STEPS"
    )
      .setCheck(
        "EmotionMotionStep"
      )
      .appendField(
        "motion steps"
      );

    this.setPreviousStatement(
      true,
      null
    );

    this.setNextStatement(
      true,
      null
    );

    this.setColour("#00a6a6");

    this.setTooltip(
      "Configure a non-blocking movement " +
      "sequence for an emotion."
    );

    this.setHelpUrl("");
  },
};


Blockly.Blocks[
  "xrp_emotion_motion_step"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Motion step")
      .appendField(
        new Blockly.FieldNumber(
          120,
          10,
          10000,
          10
        ),
        "DURATION"
      )
      .appendField("ms")
      .appendField("forward")
      .appendField(
        new Blockly.FieldNumber(
          0.0,
          -1,
          1,
          0.05
        ),
        "STRAIGHT"
      )
      .appendField("turn")
      .appendField(
        new Blockly.FieldNumber(
          0.3,
          -1,
          1,
          0.05
        ),
        "TURN"
      );

    this.setPreviousStatement(
      true,
      "EmotionMotionStep"
    );

    this.setNextStatement(
      true,
      "EmotionMotionStep"
    );

    this.setColour("#00a6a6");

    this.setTooltip(
      "One timed drivetrain command. " +
      "Forward and turn range from -1 to 1."
    );

    this.setHelpUrl("");
  },
};

Blockly.Blocks[
  "xrp_emotion_shake_motion"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Shake motion")
      .appendField(
        new Blockly.FieldNumber(
          80,
          10,
          1000,
          10
        ),
        "DURATION"
      )
      .appendField("ms each");

    this.appendDummyInput()
      .appendField("forward")
      .appendField(
        new Blockly.FieldNumber(
          0.0,
          -1,
          1,
          0.05
        ),
        "STRAIGHT"
      )
      .appendField("turn strength")
      .appendField(
        new Blockly.FieldNumber(
          0.35,
          0,
          1,
          0.05
        ),
        "TURN_STRENGTH"
      );

    this.setPreviousStatement(
      true,
      "EmotionMotionStep"
    );

    this.setNextStatement(
      true,
      "EmotionMotionStep"
    );

    this.setColour("#00a6a6");

    this.setTooltip(
      "Builds one left-right trembling motion. " +
        "Use repeat on the emotion motion block " +
        "to keep shaking."
    );

    this.setHelpUrl("");
  },
};

// ---------------------------------------------------------
// Emotion hardware configuration
// ---------------------------------------------------------

const EMOTION_MOTOR_PORT_OPTIONS = [
  ["Motor L", "L"],
  ["Motor R", "R"],
  ["Motor 3", "3"],
  ["Motor 4", "4"],
];

const EMOTION_OPTIONAL_MOTOR_OPTIONS = [
  ["Not used", "NONE"],
  ...EMOTION_MOTOR_PORT_OPTIONS,
];


Blockly.Blocks[
  "xrp_emotion_configure_hardware"
] = {
  init: function () {
    this.appendDummyInput()
      .appendField(
        "Configure emotion hardware"
      );

    this.appendDummyInput()
      .appendField("left wheel")
      .appendField(
        new Blockly.FieldDropdown(
          EMOTION_MOTOR_PORT_OPTIONS
        ),
        "DRIVE_LEFT_PORT"
      )
      .appendField("invert")
      .appendField(
        new Blockly.FieldCheckbox(
          "FALSE"
        ),
        "INVERT_LEFT"
      );

    this.appendDummyInput()
      .appendField("right wheel")
      .appendField(
        new Blockly.FieldDropdown(
          EMOTION_MOTOR_PORT_OPTIONS
        ),
        "DRIVE_RIGHT_PORT"
      )
      .appendField("invert")
      .appendField(
        new Blockly.FieldCheckbox(
          "FALSE"
        ),
        "INVERT_RIGHT"
      );

    this.appendDummyInput()
      .appendField("aux motor 1")
      .appendField(
        new Blockly.FieldDropdown(
          EMOTION_OPTIONAL_MOTOR_OPTIONS
        ),
        "AUX_MOTOR_1_PORT"
      )
      .appendField("invert")
      .appendField(
        new Blockly.FieldCheckbox(
          "FALSE"
        ),
        "INVERT_AUX_MOTOR_1"
      );

    this.appendDummyInput()
      .appendField("aux motor 2")
      .appendField(
        new Blockly.FieldDropdown(
          EMOTION_OPTIONAL_MOTOR_OPTIONS
        ),
        "AUX_MOTOR_2_PORT"
      )
      .appendField("invert")
      .appendField(
        new Blockly.FieldCheckbox(
          "FALSE"
        ),
        "INVERT_AUX_MOTOR_2"
      );

    this.appendDummyInput()
      .appendField("use IMU")
      .appendField(
        new Blockly.FieldCheckbox(
          "TRUE"
        ),
        "USE_IMU"
      );

    this.setPreviousStatement(
      true,
      null
    );

    this.setNextStatement(
      true,
      null
    );

    this.setColour("#00a6a6");

    this.setTooltip(
      "Map logical emotion motor roles " +
      "to physical XRP motor ports."
    );

    this.setHelpUrl("");

    this.setOnChange(function () {
      if (
        !this.workspace ||
        this.isInFlyout
      ) {
        return;
      }

      const selectedPorts = [
        this.getFieldValue(
          "DRIVE_LEFT_PORT"
        ),
        this.getFieldValue(
          "DRIVE_RIGHT_PORT"
        ),
        this.getFieldValue(
          "AUX_MOTOR_1_PORT"
        ),
        this.getFieldValue(
          "AUX_MOTOR_2_PORT"
        ),
      ].filter(
        (port) =>
          port &&
          port !== "NONE"
      );

      const uniquePorts =
        new Set(selectedPorts);

      if (
        uniquePorts.size !==
        selectedPorts.length
      ) {
        this.setWarningText(
          "Each motor role must use " +
          "a different physical port."
        );
      } else {
        this.setWarningText(null);
      }
    });
  },
};

// ---------------------------------------------------------
// Voice commands
// Add these blocks near the other XRP block definitions.
// ---------------------------------------------------------

const XRP_VOICE_COMMAND_DROPDOWN = [
  ["turn right", "turn_right"],
  ["turn left", "turn_left"],
  ["move back", "turn_back"],
  ["stop", "stop"],
  ["showtime", "showtime"],
  ["go to sleep", "go_to_sleep"],
  ["let\'s play", "lets_play"],
  ["turn happy", "turn_happy"],
  ["turn sad", "turn_sad"],
  ["turn excited", "turn_excited"],
  ["turn in love", "turn_in_love"],
];


Blockly.Blocks["xrp_voice_update"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Read voice command");

    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#7c3aed");
    this.setTooltip(
      "Reads the latest voice command sent by XRPWeb. Put this once near the top of your loop."
    );
    this.setHelpUrl("");
  },
};


Blockly.Blocks["xrp_voice_if_command"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("if voice command is")
      .appendField(
        new Blockly.FieldDropdown(
          XRP_VOICE_COMMAND_DROPDOWN
        ),
        "COMMAND"
      );

    this.appendStatementInput("DO")
      .setCheck(null)
      .appendField("do");

    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#7c3aed");
    this.setTooltip(
      "Runs the nested blocks if the latest voice command matches."
    );
    this.setHelpUrl("");
  },
};


Blockly.Blocks["xrp_voice_command_is"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("voice command is")
      .appendField(
        new Blockly.FieldDropdown(
          XRP_VOICE_COMMAND_DROPDOWN
        ),
        "COMMAND"
      );

    this.setOutput(true, "Boolean");
    this.setColour("#7c3aed");
    this.setTooltip(
      "Returns true when the latest voice command matches."
    );
    this.setHelpUrl("");
  },
};


Blockly.Blocks["xrp_voice_clear"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Clear voice command");

    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#7c3aed");
    this.setTooltip(
      "Clears the current voice command. Usually optional."
    );
    this.setHelpUrl("");
  },
};
