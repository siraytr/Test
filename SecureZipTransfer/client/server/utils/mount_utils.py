import subprocess

def ensure_usb_mount():
    try:
        subprocess.run(["mount", "/dev/sda1", "/mnt/usb"], check=True)
    except subprocess.CalledProcessError:
        # Already mounted or failed
        pass
