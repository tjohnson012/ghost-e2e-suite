#!/usr/bin/env bash
for i in $(seq 1 60); do curl -sf -o /dev/null http://localhost:2368/ && echo "ghost up" && exit 0; sleep 3; done; echo "ghost did not start"; exit 1
