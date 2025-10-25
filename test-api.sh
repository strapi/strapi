#!/bin/bash

echo "🔍 Diagnosing Audit Logs API..."
echo ""

# Check if TOKEN is set
if [ -z "$TOKEN" ]; then
    echo "❌ ERROR: TOKEN not set!"
    echo ""
    echo "Get your token from browser DevTools:"
    echo "1. Open http://localhost:1337/admin"
    echo "2. Press F12"
    echo "3. Go to: Application → Local Storage"
    echo "4. Copy the value of 'jwtToken'"
    echo ""
    echo "Then run:"
    echo "  export TOKEN=\"your_token_here\""
    echo "  bash test-api.sh"
    exit 1
fi

echo "✅ TOKEN is set"
echo ""

# Test 1: Check if server is running
echo "Test 1: Checking if Strapi is running..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:1337/admin)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Strapi is running (HTTP $HTTP_CODE)"
else
    echo "❌ Strapi not accessible (HTTP $HTTP_CODE)"
    exit 1
fi
echo ""

# Test 2: Check if token is valid
echo "Test 2: Checking if token is valid..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:1337/admin/users/me -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Token is valid (HTTP $HTTP_CODE)"
else
    echo "❌ Token is invalid or expired (HTTP $HTTP_CODE)"
    echo ""
    echo "Get a new token from browser DevTools at http://localhost:1337/admin"
    exit 1
fi
echo ""

# Test 3: Check audit logs endpoint (raw response)
echo "Test 3: Checking audit logs endpoint..."
echo "URL: http://localhost:1337/admin/audit-logs/audit-logs"
echo ""

RESPONSE=$(curl -s http://localhost:1337/admin/audit-logs/audit-logs -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:1337/admin/audit-logs/audit-logs -H "Authorization: Bearer $TOKEN")

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Endpoint accessible!"
    echo ""
    echo "Response (first 500 chars):"
    echo "$RESPONSE" | head -c 500
    echo ""
    echo ""
    
    # Check if it's valid JSON
    if echo "$RESPONSE" | jq empty 2>/dev/null; then
        echo "✅ Response is valid JSON"
        echo ""
        
        # Show formatted response
        echo "📊 Formatted Response:"
        echo "$RESPONSE" | jq
        echo ""
        
        # Show summary
        TOTAL=$(echo "$RESPONSE" | jq -r '.meta.pagination.total // 0')
        echo "📈 Summary:"
        echo "  Total logs: $TOTAL"
        
        if [ "$TOTAL" -gt 0 ]; then
            echo ""
            echo "✨ Success! You have $TOTAL audit log(s)"
            echo ""
            echo "Latest log:"
            echo "$RESPONSE" | jq '.data[0]'
        else
            echo ""
            echo "⚠️  No audit logs found yet."
            echo ""
            echo "Create some content to generate logs:"
            echo "1. Go to http://localhost:1337/admin"
            echo "2. Content Manager → Create an article"
            echo "3. Save"
            echo "4. Run this script again"
        fi
    else
        echo "❌ Response is NOT valid JSON"
        echo ""
        echo "Full response:"
        echo "$RESPONSE"
    fi
elif [ "$HTTP_CODE" = "403" ]; then
    echo "❌ Forbidden (403)"
    echo ""
    echo "Permission not enabled! Do this:"
    echo "1. Go to http://localhost:1337/admin"
    echo "2. Settings → Roles → Super Admin"
    echo "3. Under Plugins, find 'Audit Logs'"
    echo "4. Check ✓ the 'Read' checkbox"
    echo "5. Save"
    echo "6. Run this script again"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ Not Found (404)"
    echo ""
    echo "Plugin might not be loaded. Check server logs:"
    echo "  tail -50 /tmp/strapi.log | grep -i audit"
else
    echo "❌ Unexpected status code: $HTTP_CODE"
    echo ""
    echo "Response:"
    echo "$RESPONSE"
fi

echo ""
echo "🔗 Quick Links:"
echo "  Admin Panel: http://localhost:1337/admin"
echo "  Server Logs: tail -f /tmp/strapi.log"
echo ""

