#!/bin/bash

mkdir -p ./logs

# The hook execution engine provides these parameters
EVENT_NAME=$1
SESSION_ID=$2
PAYLOAD_FILE=$3

# Fallback if no session ID is provided
if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" == "undefined" ] || [ "$SESSION_ID" == "null" ]; then
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  SESSION_ID="unknown_${TIMESTAMP}"
fi

LOGFILE="./logs/session_${SESSION_ID}.txt"

# Initialize the log file with a header
echo "=====================================" > "$LOGFILE"
echo "        Agent Session Log ($SESSION_ID)" >> "$LOGFILE"
echo "=====================================" >> "$LOGFILE"
echo "Session Started: $(date)" >> "$LOGFILE"
echo "" >> "$LOGFILE"
echo -n "[$(date +"%Y-%m-%dT%H:%M:%S%z")] [$EVENT_NAME] " >> "$LOGFILE"
if [ -f "$PAYLOAD_FILE" ]; then
  cat "$PAYLOAD_FILE" >> "$LOGFILE"
else
  echo -n "$PAYLOAD_FILE" >> "$LOGFILE"
fi
echo "" >> "$LOGFILE"
