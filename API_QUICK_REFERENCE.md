# 🚀 Audit Logs API - Quick Reference

## ⚠️ Important: Use `/admin` prefix, NOT `/api`!

These are **admin routes**, so all endpoints start with `/admin/audit-logs/`

---

## 🔑 Getting Your Token

**From Browser (Easiest):**
1. Open http://localhost:1337/admin
2. Press F12 (DevTools)
3. Go to: Application → Local Storage → http://localhost:1337
4. Copy value of `jwtToken`

**From API:**
```bash
curl -X POST http://localhost:1337/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' | jq -r '.data.token'
```

**Set Your Token:**
```bash
export TOKEN="paste_token_here"
```

---

## 📋 All Endpoints

### 1. Get All Audit Logs
```bash
curl http://localhost:1337/admin/audit-logs/audit-logs \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 2. Get Single Audit Log
```bash
curl http://localhost:1337/admin/audit-logs/audit-logs/1 \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 3. Get Statistics
```bash
curl http://localhost:1337/admin/audit-logs/stats \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 🔍 Filtering Examples

### By Action
```bash
# Create actions only
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=create" \
  -H "Authorization: Bearer $TOKEN" | jq

# Update actions only
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=update" \
  -H "Authorization: Bearer $TOKEN" | jq

# Delete actions only
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=delete" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### By Content Type
```bash
curl "http://localhost:1337/admin/audit-logs/audit-logs?contentType=api::article.article" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### By User ID
```bash
curl "http://localhost:1337/admin/audit-logs/audit-logs?userId=1" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### By Date Range
```bash
# Today's logs
TODAY=$(date +%Y-%m-%d)
curl "http://localhost:1337/admin/audit-logs/audit-logs?startDate=${TODAY}T00:00:00.000Z" \
  -H "Authorization: Bearer $TOKEN" | jq

# Last hour
HOUR_AGO=$(date -u -v-1H +%Y-%m-%dT%H:%M:%S.000Z)
curl "http://localhost:1337/admin/audit-logs/audit-logs?startDate=${HOUR_AGO}" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Multiple Filters
```bash
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=create&contentType=api::article.article&userId=1" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 📄 Pagination & Sorting

### Pagination
```bash
# Page 1, 10 items
curl "http://localhost:1337/admin/audit-logs/audit-logs?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" | jq

# Page 2, 5 items
curl "http://localhost:1337/admin/audit-logs/audit-logs?page=2&pageSize=5" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Sorting
```bash
# Newest first
curl "http://localhost:1337/admin/audit-logs/audit-logs?sort=timestamp:desc" \
  -H "Authorization: Bearer $TOKEN" | jq

# Oldest first
curl "http://localhost:1337/admin/audit-logs/audit-logs?sort=timestamp:asc" \
  -H "Authorization: Bearer $TOKEN" | jq

# By action
curl "http://localhost:1337/admin/audit-logs/audit-logs?sort=action:asc" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 🎯 Common Use Cases

### Get Latest Log
```bash
curl "http://localhost:1337/admin/audit-logs/audit-logs?sort=timestamp:desc&pageSize=1" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Get All Creates for Today
```bash
TODAY=$(date +%Y-%m-%d)
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=create&startDate=${TODAY}T00:00:00.000Z" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Get User's Activity
```bash
curl "http://localhost:1337/admin/audit-logs/audit-logs?userId=1&sort=timestamp:desc" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Check Recent Updates
```bash
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=update&sort=timestamp:desc&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 📊 Response Format

### Audit Logs List
```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "contentType": "api::article.article",
      "recordId": "xyz789",
      "action": "create",
      "timestamp": "2025-10-25T12:00:00.000Z",
      "user": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "changedFields": [],
      "previousData": null,
      "newData": {
        "title": "My Article",
        "content": "Content here"
      },
      "createdAt": "2025-10-25T12:00:00.000Z",
      "updatedAt": "2025-10-25T12:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 1
    }
  }
}
```

### Statistics
```json
{
  "data": {
    "total": 15,
    "byAction": {
      "create": 8,
      "update": 5,
      "delete": 2
    },
    "byContentType": {
      "api::article.article": 10,
      "plugin::users-permissions.user": 5
    }
  }
}
```

---

## 🐛 Troubleshooting

### 404 Error
❌ **Wrong:** `/api/audit-logs/audit-logs`
✅ **Correct:** `/admin/audit-logs/audit-logs`

### 403 Forbidden
Enable permission:
1. Settings → Roles → Super Admin
2. Plugins → Audit Logs → ✅ Read
3. Save

### 401 Unauthorized
Get a new token (see "Getting Your Token" above)

### Empty Response
Create some content first:
1. Content Manager → Create article
2. Save
3. Check logs again

---

## ✅ Quick Test Sequence

```bash
# 1. Set token
export TOKEN="your_token"

# 2. Verify token works
curl http://localhost:1337/admin/users/me -H "Authorization: Bearer $TOKEN" | jq

# 3. Get all logs
curl http://localhost:1337/admin/audit-logs/audit-logs -H "Authorization: Bearer $TOKEN" | jq

# 4. Get stats
curl http://localhost:1337/admin/audit-logs/stats -H "Authorization: Bearer $TOKEN" | jq

# 5. Filter by action
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=create" -H "Authorization: Bearer $TOKEN" | jq
```

---

## 💡 Pro Tips

1. **Use jq** for readable JSON:
   ```bash
   curl ... | jq
   ```

2. **Save response to file:**
   ```bash
   curl ... | jq > audit_logs.json
   ```

3. **Count logs:**
   ```bash
   curl ... | jq '.meta.pagination.total'
   ```

4. **Get only actions:**
   ```bash
   curl ... | jq '.data[].action'
   ```

5. **Watch logs in real-time:**
   ```bash
   watch -n 2 'curl -s http://localhost:1337/admin/audit-logs/audit-logs?sort=timestamp:desc&pageSize=5 -H "Authorization: Bearer $TOKEN" | jq ".data[].action"'
   ```

---

## 🔗 Quick Links

- **Admin Panel:** http://localhost:1337/admin
- **Base API URL:** http://localhost:1337/admin/audit-logs/
- **Server Logs:** `tail -f /tmp/strapi.log`
- **Database:** `sqlite3 examples/empty/.tmp/data.db`

---

**Need more help?** Check `TEST_NOW.md` for complete testing guide!

