#!/usr/bin/env bash
# Requires server running at http://localhost:8080
set -e
tmpfile=/tmp/test-upload.bin
dd if=/dev/urandom of=$tmpfile bs=1M count=10
sha=$(sha256sum $tmpfile | awk '{print $1}')
echo "sha: $sha"
init=$(curl -s -X POST -H "Content-Type: application/json" -d "{"filename":"test.bin","size":$(stat -c%s $tmpfile),"checksum":"$sha"}" http://localhost:8080/api/upload/init)
id=$(echo $init | jq -r .upload_id)
echo "id: $id"
chunksize=$(echo $init | jq -r .chunk_size)
total=$(( ( $(stat -c%s $tmpfile) + chunksize -1 ) / chunksize ))
for i in $(seq 0 $((total-1))); do
  start=$((i*chunksize))
  dd if=$tmpfile bs=1 skip=$start count=$chunksize 2>/dev/null | curl -s -X POST "http://localhost:8080/api/upload/${id}/chunk?index=${i}" --data-binary @- -H "Content-Type: application/octet-stream"
done
curl -s -X POST -H "Content-Type: application/json" -d "{"total_chunks":$total,"checksum":"$sha"}" http://localhost:8080/api/upload/${id}/complete
echo "done"
