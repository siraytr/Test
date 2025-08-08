import os
import zipfile
import time

def zip_folder(folder_path):
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    zip_name = f"temp_upload_{timestamp}.zip"
    zip_path = os.path.join(os.getcwd(), zip_name)
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(folder_path):
            for file in files:
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, folder_path)
                zipf.write(full_path, arcname)
    return zip_path
