#!/bin/bash

echo "🎯 Testing Audit Logs API"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if TOKEN is set
if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ ERROR: TOKEN environment variable not set!${NC}"
    echo ""
    echo "To get your token:"
    echo "1. Open http://localhost:1337/admin in your browser"
    echo "2. Press F12 to open DevTools"
    echo "3. Go to: Application → Local Storage → http://localhost:1337"
    echo "4. Find 'jwtToken' and copy its value"
    echo ""
    echo "Then run:"
    echo -e "${YELLOW}  export TOKEN=\"your_jwt_token_here\"${NC}"
    echo -e "${YELLOW}  bash test-audit-logs.sh${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ TOKEN is set${NC}"
echo ""

# Test 1: Check database
echo "📊 Database Check:"
DB_COUNT=$(sqlite3 /Users/abjaiswal/Repository/Personal/strapi-assignment/examples/empty/.tmp/data.db "SELECT COUNT(*) FROM audit_logs;" 2>/dev/null)
if [ "$DB_COUNT" -gt 0 ]; then
    echo -e "  ${GREEN}✅ Found $DB_COUNT audit logs in database${NC}"
else
    echo -e "  ${YELLOW}⚠️  No audit logs in database yet${NC}"
    echo "     Create some content in the admin panel first!"
fi
echo ""

# Test 2: Verify token
echo "🔐 Token Verification:"
USER_RESPONSE=$(curl -s http://localhost:1337/admin/users/me -H "Authorization: Bearer $TOKEN")
USER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:1337/admin/users/me -H "Authorization: Bearer $TOKEN")

if [ "$USER_STATUS" = "200" ]; then
    USER_EMAIL=$(echo "$USER_RESPONSE" | jq -r '.data.email // .email // "unknown"' 2>/dev/null)
    echo -e "  ${GREEN}✅ Token is valid${NC}"
    echo "     Logged in as: $USER_EMAIL"
else
    echo -e "  ${RED}❌ Token is invalid (HTTP $USER_STATUS)${NC}"
    echo "     Get a new token from browser DevTools"
    exit 1
fi
echo ""

# Test 3: Check audit logs API
echo "🔍 Testing Audit Logs API:"
echo "  URL: http://localhost:1337/admin/audit-logs/audit-logs"
echo ""

AUDIT_RESPONSE=$(curl -s http://localhost:1337/admin/audit-logs/audit-logs -H "Authorization: Bearer $TOKEN")
AUDIT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:1337/admin/audit-logs/audit-logs -H "Authorization: Bearer $TOKEN")

echo "  HTTP Status: $AUDIT_STATUS"

if [ "$AUDIT_STATUS" = "200" ]; then
    echo -e "  ${GREEN}✅ API is accessible!${NC}"
    echo ""
    
    # Check if response is valid JSON
    if echo "$AUDIT_RESPONSE" | jq empty 2>/dev/null; then
        echo -e "${GREEN}✅ Response is valid JSON${NC}"
        echo ""
        
        # Get counts
        TOTAL=$(echo "$AUDIT_RESPONSE" | jq -r '.meta.pagination.total // 0' 2>/dev/null)
        PAGE_SIZE=$(echo "$AUDIT_RESPONSE" | jq -r '.meta.pagination.pageSize // 0' 2>/dev/null)
        
        echo "📈 Summary:"
        echo "  Total logs: $TOTAL"
        echo "  Page size: $PAGE_SIZE"
        echo ""
        
        if [ "$TOTAL" -gt 0 ]; then
            echo -e "${GREEN}🎉 SUCCESS! Audit logs are working!${NC}"
            echo ""
            echo "📋 Latest audit logs:"
            echo "$AUDIT_RESPONSE" | jq '.data[] | {
              id: .id,
              contentType: .contentType,
              action: .action,
              timestamp: .timestamp,
              user: .user.email
            }' 2>/dev/null | head -50
            echo ""
            
            # Show some sample queries
            echo "💡 Try these queries:"
            echo ""
            echo "# Get all create actions:"
            echo -e "${YELLOW}curl \"http://localhost:1337/admin/audit-logs/audit-logs?action=create\" -H \"Authorization: Bearer \$TOKEN\" | jq${NC}"
            echo ""
            echo "# Get latest 5 logs:"
            echo -e "${YELLOW}curl \"http://localhost:1337/admin/audit-logs/audit-logs?sort=timestamp:desc&pageSize=5\" -H \"Authorization: Bearer \$TOKEN\" | jq${NC}"
            echo ""
            echo "# Get statistics:"
            echo -e "${YELLOW}curl \"http://localhost:1337/admin/audit-logs/stats\" -H \"Authorization: Bearer \$TOKEN\" | jq${NC}"
            echo ""
        else
            echo -e "${YELLOW}⚠️  API works but no logs returned${NC}"
            echo ""
            echo "This could mean:"
            echo "1. Permission not enabled - Check Settings → Roles → Super Admin → Audit Logs → Read"
            echo "2. No content created yet - Create an article in Content Manager"
        fi
    else
        echo -e "${RED}❌ Response is NOT valid JSON${NC}"
        echo ""
        echo "Response preview:"
        echo "$AUDIT_RESPONSE" | head -30
        echo ""
        echo "This might mean permission is not enabled."
        echo "Enable it: Settings → Roles → Super Admin → Audit Logs → Read"
    fi
    
elif [ "$AUDIT_STATUS" = "403" ]; then
    echo -e "  ${RED}❌ Forbidden (403)${NC}"
    echo ""
    echo "Permission not enabled! Fix this:"
    echo "1. Go to http://localhost:1337/admin"
    echo "2. Settings → Roles → Super Admin"
    echo "3. Under Plugins, find 'Audit Logs'"
    echo "4. Check ✓ the 'Read' checkbox"
    echo "5. Click Save"
    echo "6. Run this script again"
    
elif [ "$AUDIT_STATUS" = "401" ]; then
    echo -e "  ${RED}❌ Unauthorized (401)${NC}"
    echo ""
    echo "Token is invalid or expired. Get a new one:"
    echo "1. Open http://localhost:1337/admin"
    echo "2. Press F12"
    echo "3. Application → Local Storage → jwtToken"
    echo "4. Copy the value"
    echo "5. export TOKEN=\"new_token\""
    echo "6. Run this script again"
    
elif [ "$AUDIT_STATUS" = "404" ]; then
    echo -e "  ${RED}❌ Not Found (404)${NC}"
    echo ""
    echo "Plugin routes not registered. Try:"
    echo "1. Restart Strapi"
    echo "2. Check server logs: tail -50 /tmp/strapi.log | grep audit"
    
else
    echo -e "  ${RED}❌ Unexpected status: $AUDIT_STATUS${NC}"
    echo ""
    echo "Response:"
    echo "$AUDIT_RESPONSE" | head -50
fi

echo ""
echo "=========================="

