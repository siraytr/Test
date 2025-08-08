#!/bin/bash

MOUNT_POINT="/mnt/external"
DEVICE="/dev/sda1"

if ! mountpoint -q "$MOUNT_POINT"; then
  echo "[Mount] Versuche $DEVICE nach $MOUNT_POINT zu mounten..."
  sudo mkdir -p "$MOUNT_POINT"
  sudo mount "$DEVICE" "$MOUNT_POINT"
  if [ $? -eq 0 ]; then
    echo "[Mount] Erfolgreich gemountet."
  else
    echo "[Mount] Fehler beim Mounten von $DEVICE!"
    exit 1
  fi
else
  echo "[Mount] Bereits gemountet."
fi
