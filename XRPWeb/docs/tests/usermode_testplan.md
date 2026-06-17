# Overview

User Mode is a feature for controlling how user would like to see the XRP Robot filesystem in the folder view. There are three types of User Mode.

- System
- User
- Google User

This test plan outline the manual test cases for the User Mode feature.

## System
In this mode, the user see the entire folder structure except the XRP Robot libraries.

## User
In this mode, the user see only the configured user folder.

## Google User
In this mode, the user see the files from the Google Drive. The user shall be able to perform all operations on the files in Google Drive like the can perform file operations in the other user modes on the XRP Robot filesystem, i.e., see the list below

- Create
- Rename
- Edit
- Delete

When the first Google User Signed Into their Google account, this user will be assiged as the administrator of the XRP Robot. Only the administrator can
changed the user modes.

## Test Cases

| ID | SR ID | Description                                    | Steps                                                                          | Expected                              | Actual                      | Pass? |
|----|-------|------------------------------------------------|--------------------------------------------------------------------------------|---------------------------------------|-----------------------------|-------|
| 1  | 1     | Connect with no admin settings | 1. Start XRPWeb<br>2. Clean localstorage mode settings and user. admin.json file can be deleted using Thonny. Connect to XRP Robot using Thonny. At the prompt, type import os and os.delete('admin.json')<br>3. Click Connect Button and select a connection method    | XRP connected and System mode is shown             | XRP filesystem shows System mode folders    |  passed |
| 2  | 2     | Google Sign In without connection  | 1. Start XRPWeb<br>2. Ensure localstorage is cleared<br>3. Open Settings<br>4. Click Google Sign In button<br>5. Following the Sign In page to sign into Google | Google account signed in and see only Google folder items | Google Drive folder content is shown |   |
| 3  | 3     | Google Sign In without connection and file CRUD | 1. Using SR 2 steps to sign into Google account<br> 2. Click the create new folder<br> 3. Ensure folder is created in Google Drive<br> 4. In context menu, select rename, and change the folder name<br> 5. Ensure the folder is changed<br> 6. In context menu, click delete and ensure folder is deleted in Google Drive | All CRUD operations successfull in XRP disconnected mode | All CRUD operations successfull in XRP disconnected mode |
| 4  | 4     | Google Sign In and Connect | 1. Start XRPWeb<br> 2. Clean localstorage and delete admin.json if exist<br> 3. Google Sign In<br> 4. Click Connect<br> 5. Verify only Google drive files are shown<br> 6. Open settings<br> 7. Verify this user is able to change mode| Google user is selected as admin and successfully transition from Google Sign In to Connect| Google user is selected as admin and successfully transition from Google Sign In to Connect | |
| 5  | 5     | Change to System mode | 1. Start XRPWeb<br>2. Clean localstorage mode settings and user and connect to XRP<br>3. Sign In as admin<br>4. Change to System Mode<br>5. Ensure System is changed and only System mode folders are showned<br>6. Restart XRPWeb and re-connect<br>7. Ensure only System mode folder and files are shown. | System mode is changed and all folder and files are shown. | System mode is changed and all folder and files are shown. |
| 6  | 6     | Change to User mode | 1. Start XRPWeb<br> 2. Connect to XRP<br>3. Sign In Google account<br>4. Open Settings, and change User Mode to use<br>| User mode has changed | User mode has changed | 
| 7  | 7     | Add User | 1. Continue from SD ID 6<br>2. Click Add user<br>3. Fill in the username and ensure the username match required pattern. Verify that if validation error is shown for invalid username and success message is shown for valid username<br>4. Click Add User button to add the user<br>5. Click the Select button and ensure the newly added user is on the user list | User is added | User is added |
| 8  | 8     | Select User | 1. Continue from SD ID 7<br>2. Click Select User button<br>Select a user from the list and Verify the user previous added is shown<br>3. Very that the select user folder is shown. | Select user folder is shown | Select user folder is shown |
| 9  | 9     | Change to Google User mode | 1. Start XRPWeb<br>2. Connect<br>3. Sign in Google account as admin<br>4. Open Settings and change mode to Google User<br>Verify Google User mode files are shown | Google User drive files are shown | Google User drive files are shown |
| 10 | 10    | Switch modes | 1. 1. Start XRPWeb<br>2. Connect<br>Sign in Google account as admin<br>3. Open Settings and change to differnt modes<br>4. Verify mode change be changed and the content of each modes are displayed correctly, i.e., matching the mode's requirement. | User Mode can be changed and specific mode folder and files are displayed correctly | User Mode can be changed and specific mode folder and files are displayed correctly |
