# Run from your computer with:
#
#   py -m mpremote connect auto run .\finish_redvision_upload.py
#
# It finishes any Red Vision custom upload that was
# left as /emotion_sheets_custom/<name>.png.tmp.

import os
import ujson

DIRECTORY = "/emotion_sheets_custom"
MANIFEST_PATH = DIRECTORY + "/manifest.json"
FRAME_SIZE = 192
DEFAULT_FPS = 4
DEFAULT_REPEAT_MODE = "loop"


def path_join(directory, filename):
    return directory + "/" + filename


try:
    names = os.listdir(DIRECTORY)
except OSError:
    print("No custom sheet directory found.")
    raise SystemExit


try:
    manifest_file = open(MANIFEST_PATH, "r")
    manifest = ujson.loads(manifest_file.read())
    manifest_file.close()
except Exception:
    manifest = {}


fixed_count = 0

for filename in names:
    if not filename.endswith(".png.tmp"):
        continue

    final_filename = filename[:-4]
    emotion_name = final_filename[:-4]

    temporary_path = path_join(DIRECTORY, filename)
    final_path = path_join(DIRECTORY, final_filename)

    try:
        os.remove(final_path)
    except OSError:
        pass

    os.rename(temporary_path, final_path)

    frame_count = 1

    try:
        import cv2 as cv

        image = cv.imread(final_path)

        if image is not None:
            height = image.shape[0]

            if height % FRAME_SIZE == 0:
                frame_count = height // FRAME_SIZE

    except Exception as error:
        print(
            "Could not inspect PNG size for",
            emotion_name,
            error,
        )

    manifest[emotion_name] = {
        "frame_count": frame_count,
        "default_fps": DEFAULT_FPS,
        "repeat_mode": DEFAULT_REPEAT_MODE,
    }

    fixed_count += 1

    print(
        "Finished upload:",
        emotion_name,
        "frames:",
        frame_count,
    )


manifest_file = open(MANIFEST_PATH, "w")
manifest_file.write(ujson.dumps(manifest))
manifest_file.close()

print("RECOVERY_OK", fixed_count)
