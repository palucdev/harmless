#!/bin/bash

mkdir -p ./logs

# The hook execution engine provides these parameters
EVENT_NAME=$1
SESSION_ID=$2
PAYLOAD=$3

# If an event doesn't have a sessionId (like skill:onLoad), use "global" log
if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" == "undefined" ] || [ "$SESSION_ID" == "null" ]; then
  SESSION_ID="global"
fi

LOGFILE="./logs/session_${SESSION_ID}.txt"

# Append the event and payload
echo "Event: $EVENT_NAME" >> "$LOGFILE"
echo "Time: $(date)" >> "$LOGFILE"
echo "Payload:" >> "$LOGFILE"
echo "$PAYLOAD" >> "$LOGFILE"
echo "-------------------------------------" >> "$LOGFILE"
