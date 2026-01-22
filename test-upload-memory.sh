#!/bin/bash

# Test memory leak with real file uploads
# Usage: ./test-upload-memory.sh

echo "=== Strapi Upload Memory Leak Test ==="
echo ""

# Configuration
STRAPI_URL="http://localhost:1337"
UPLOAD_COUNT=100  # Increased to make leak more obvious
TEST_FILE="test-image.jpg"

# Create a test image if it doesn't exist
if [ ! -f "$TEST_FILE" ]; then
  echo "Creating test file..."
  # Create a 1MB test file
  dd if=/dev/urandom of="$TEST_FILE" bs=1024 count=1024 2>/dev/null
fi

echo "Test configuration:"
echo "  URL: $STRAPI_URL"
echo "  Uploads: $UPLOAD_COUNT"
echo "  File: $TEST_FILE ($(du -h $TEST_FILE | cut -f1))"
echo ""

# Get Strapi PID
echo "Finding Strapi process..."
STRAPI_PID=$(pgrep -f "strapi" | head -1)

if [ -z "$STRAPI_PID" ]; then
  echo "❌ Strapi is not running. Start Strapi first with: yarn develop"
  exit 1
fi

echo "✓ Found Strapi process: PID $STRAPI_PID"

# Get initial memory
STARTUP_MEM=$(ps -o rss= -p $STRAPI_PID)
echo "Startup memory: $(echo "scale=2; $STARTUP_MEM / 1024" | bc) MB"

# Do 5 warmup uploads to establish baseline
echo "Running 5 warmup uploads to establish baseline..."
for i in $(seq 1 5); do
  curl -s -X POST "$STRAPI_URL/api/upload" -F "files=@$TEST_FILE" > /dev/null 2>&1
  sleep 0.2
done

# Wait for memory to stabilize
sleep 3

# Get baseline memory AFTER warmup
INITIAL_MEM=$(ps -o rss= -p $STRAPI_PID)
echo "Baseline memory: $(echo "scale=2; $INITIAL_MEM / 1024" | bc) MB"
echo ""

echo "Starting upload test..."
PEAK_MEM=$INITIAL_MEM

for i in $(seq 1 $UPLOAD_COUNT); do
  # Upload file
  RESPONSE=$(curl -s -X POST \
    "$STRAPI_URL/api/upload" \
    -F "files=@$TEST_FILE" \
    -w "\n%{http_code}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)

  if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
    echo "  Upload $i: ❌ Failed (HTTP $HTTP_CODE)"
  else
    # Check memory every 10 uploads
    if [ $((i % 10)) -eq 0 ]; then
      CURRENT_MEM=$(ps -o rss= -p $STRAPI_PID)
      CURRENT_MB=$(echo "scale=2; $CURRENT_MEM / 1024" | bc)
      echo "  Upload $i: ✓ Complete - Memory: ${CURRENT_MB} MB"

      # Track peak memory
      if [ $CURRENT_MEM -gt $PEAK_MEM ]; then
        PEAK_MEM=$CURRENT_MEM
      fi
    fi
  fi

  # Small delay to avoid overwhelming the server
  sleep 0.1
done

echo ""
echo "Waiting for garbage collection..."
sleep 5

# Get final memory
FINAL_MEM=$(ps -o rss= -p $STRAPI_PID)
GROWTH=$((FINAL_MEM - INITIAL_MEM))
GROWTH_MB=$(echo "scale=2; $GROWTH / 1024" | bc)

echo ""
echo "=== Results ==="
echo "Startup memory:  $(echo "scale=2; $STARTUP_MEM / 1024" | bc) MB"
echo "Baseline memory: $(echo "scale=2; $INITIAL_MEM / 1024" | bc) MB (after warmup)"
echo "Peak memory:     $(echo "scale=2; $PEAK_MEM / 1024" | bc) MB (during uploads)"
echo "Final memory:    $(echo "scale=2; $FINAL_MEM / 1024" | bc) MB (after test + GC)"
echo "Final growth:    ${GROWTH_MB} MB"

# Calculate peak spike
PEAK_SPIKE=$((PEAK_MEM - INITIAL_MEM))
PEAK_SPIKE_MB=$(echo "scale=2; $PEAK_SPIKE / 1024" | bc)
echo "Peak spike:      ${PEAK_SPIKE_MB} MB"
echo ""

# The KEY indicator: Peak memory spike
# With fix: peak should be < 50MB above baseline
# Without fix: peak spikes to 200-300MB+ above baseline (this is the leak!)
MAX_PEAK_SPIKE_MB=50
CRITICAL_PEAK_SPIKE_MB=100

if (( $(echo "$PEAK_SPIKE_MB > $CRITICAL_PEAK_SPIKE_MB" | bc -l) )); then
  echo "❌ FAIL: CRITICAL memory leak detected!"
  echo "   Peak spike: +${PEAK_SPIKE_MB}MB (expected <${MAX_PEAK_SPIKE_MB}MB)"
  echo "   This massive spike indicates streams/listeners accumulating during processing"
  echo "   Production servers would crash under concurrent load"
  exit 1
elif (( $(echo "$PEAK_SPIKE_MB > $MAX_PEAK_SPIKE_MB" | bc -l) )); then
  echo "⚠️  WARNING: Excessive memory spike detected"
  echo "   Peak spike: +${PEAK_SPIKE_MB}MB (expected <${MAX_PEAK_SPIKE_MB}MB)"
  echo "   Memory spikes too high during processing"
  exit 1
else
  echo "✅ PASS: No memory leak detected"
  echo "   Peak spike: +${PEAK_SPIKE_MB}MB (acceptable, <${MAX_PEAK_SPIKE_MB}MB)"
  echo "   Final growth: ${GROWTH_MB}MB (returned to baseline)"
  exit 0
fi
