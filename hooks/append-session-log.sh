#!/bin/bash

mkdir -p ./logs

# The hook execution engine provides these parameters
EVENT_NAME=$1
SESSION_ID=$2
PAYLOAD_FILE=$3

# If an event doesn't have a sessionId (like skill:onLoad), use "global" log
if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" == "undefined" ] || [ "$SESSION_ID" == "null" ]; then
  SESSION_ID="global"
fi

LOGFILE="./logs/session_${SESSION_ID}.txt"

# Append the event and payload
echo -n "[$(date +"%Y-%m-%dT%H:%M:%S%z")] [$EVENT_NAME] " >> "$LOGFILE"
if [ -f "$PAYLOAD_FILE" ]; then
  cat "$PAYLOAD_FILE" >> "$LOGFILE"
else
  echo -n "$PAYLOAD_FILE" >> "$LOGFILE"
fi
echo "" >> "$LOGFILE"
