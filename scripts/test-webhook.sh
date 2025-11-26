#!/bin/bash

# Test script for Twilio webhook endpoints

BASE_URL="${1:-http://localhost:3000}"

echo "Testing webhook endpoints at: $BASE_URL"
echo ""

# Test GET endpoint (health check)
echo "1. Testing GET /api/call/voice (health check)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BASE_URL/api/call/voice")
http_code=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "   Status: $http_code"
echo "   Response: $body"
echo ""

# Test POST endpoint with sample Twilio data
echo "2. Testing POST /api/call/voice (Twilio webhook simulation)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/call/voice" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CA1234567890abcdef1234567890abcdef" \
  -d "CallStatus=ringing" \
  -d "From=%2B1234567890" \
  -d "To=%2B0987654321")
http_code=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "   Status: $http_code"
if [ "$http_code" = "200" ]; then
  echo "   ✓ Endpoint is accessible and returning TwiML"
  echo "   Response preview:"
  echo "$body" | head -5
else
  echo "   ✗ Endpoint returned error status"
  echo "   Response: $body"
fi
echo ""

# Test gather endpoint
echo "3. Testing POST /api/call/gather..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/call/gather?callSid=CA1234567890abcdef1234567890abcdef&questionIndex=0" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CA1234567890abcdef1234567890abcdef" \
  -d "SpeechResult=Hello%2C%20I%27m%20feeling%20good%20today")
http_code=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "   Status: $http_code"
if [ "$http_code" = "200" ]; then
  echo "   ✓ Gather endpoint is accessible"
else
  echo "   ✗ Gather endpoint returned error"
  echo "   Response: $body"
fi
echo ""

echo "Test complete!"

