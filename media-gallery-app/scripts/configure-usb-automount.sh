#!/usr/bin/env bash
# Setzt udev rule und systemd mount/automount unit (Label=MEDIA)
set -euo pipefail

# Kopiere rule
sudo cp udev/99-media-automount.rules /etc/udev/rules.d/99-media-automount.rules
sudo udevadm control --reload

# Kopiere mount units
sudo cp systemd/mnt-media.mount /etc/systemd/system/mnt-media.mount
sudo cp systemd/mnt-media.automount /etc/systemd/system/mnt-media.automount

sudo systemctl daemon-reload
sudo systemctl enable --now mnt-media.automount

echo "udev rule und automount installiert. Teste: stecke einen USB-Stick mit LABEL=MEDIA ein."
