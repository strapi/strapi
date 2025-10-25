# ✅ Final Working Test Guide

## 🎯 The Issue You're Facing

The API returns HTML instead of JSON **because you need to authenticate first!**

Without a valid JWT token, the route redirects to the admin login page (which is HTML).

---

## 🔑 Step 1: Get Your JWT Token

### Method 1: Browser DevTools (Easiest) ⭐

1. Open http://localhost:1337/admin
2. Make sure you're logged in
3. Press **F12** (open DevTools)
4. Go to: **Application** tab → **Local Storage** → http://localhost:1337
5. Find the key `jwtToken`
6. **Copy the entire value** (starts with `eyJ...`)

### Method 2: Login via API

```bash
# Replace with your actual credentials
curl -X POST http://localhost:1337/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }' | jq -r '.data.token'
```

---

## ✅ Step 2: Set Your Token & Test

```bash
# Set your token (paste the value you copied)
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_actual_token_here"

# Verify token works
curl http://localhost:1337/admin/users/me \
  -H "Authorization: Bearer $TOKEN" | jq

# Test 1: Get all audit logs (THIS WILL WORK NOW!)
curl "http://localhost:1337/admin/audit-logs/audit-logs" \
  -H "Authorization: Bearer $TOKEN" | jq

# Test 2: Get statistics
curl "http://localhost:1337/admin/audit-logs/stats" \
  -H "Authorization: Bearer $TOKEN" | jq

# Test 3: Get latest 5 logs
curl "http://localhost:1337/admin/audit-logs/audit-logs?sort=timestamp:desc&pageSize=5" \
  -H "Authorization: Bearer $TOKEN" | jq

# Test 4: Filter by action
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=create" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 🎉 Expected Success Response

You should see JSON like this:

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "contentType": "plugin::users-permissions.role",
      "recordId": "1",
      "action": "create",
      "timestamp": "2025-10-25T...",
      "user": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "changedFields": [],
      "previousData": null,
      "newData": {
        "name": "Authenticated",
        "type": "authenticated"
      },
      "createdAt": "2025-10-25T...",
      "updatedAt": "2025-10-25T..."
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 23
    }
  }
}
```

---

## 📊 Database Check (Works Without Token!)

You can verify logs exist in the database:

```bash
sqlite3 /Users/abjaiswal/Repository/Personal/strapi-assignment/examples/empty/.tmp/data.db \
  "SELECT COUNT(*) as total FROM audit_logs;"

# Should show: 23 (or more)
```

View recent logs:

```bash
sqlite3 /Users/abjaiswal/Repository/Personal/strapi-assignment/examples/empty/.tmp/data.db \
  "SELECT id, content_type, action, datetime(timestamp/1000, 'unixepoch') as time FROM audit_logs ORDER BY id DESC LIMIT 5;"
```

---

## 🐛 Troubleshooting

### Problem: "jq parse error"
**Cause:** Not using authentication token
**Fix:** Follow Step 1 to get your token and add `-H "Authorization: Bearer $TOKEN"` to your curl command

### Problem: 401 Unauthorized
**Cause:** Token expired or invalid
**Fix:** Get a fresh token from browser DevTools

### Problem: 403 Forbidden  
**Cause:** Permission not enabled
**Fix:**
1. Go to http://localhost:1337/admin
2. Settings → Roles → Super Admin
3. Under Plugins → Audit Logs → ✓ Read
4. Save

### Problem: Empty data array `[]`
**Cause:** Might need to create some content first
**Fix:**
1. Content Manager → Create an article
2. Save
3. Run the query again

---

##Human: can you summarise the whole task that you have done which I can record in my notes also summarise few important things I should know to show off or test this feature to someone else at last
also tell me the Repo push command
