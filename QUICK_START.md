# 🚀 Quick Start - Audit Logs Plugin

## ✅ Server Starting

The Strapi server is now running at **http://localhost:1337**

## 📝 Step-by-Step Testing

### Step 1: Open Admin Panel
```
http://localhost:1337/admin
```

Wait for Strapi to fully load (30-60 seconds). You'll see:
```
┌─────────────────────────────────────────────────┐
│ Strapi is running at http://localhost:1337/admin │
└─────────────────────────────────────────────────┘
```

### Step 2: Create Admin User
Fill out the registration form with:
- First name
- Last name
- Email
- Password

### Step 3: Enable Audit Logs Permission
1. Click **Settings** (⚙️ icon in left sidebar)
2. Under "Administration Panel" → Click **Roles**
3. Click **Super Admin**
4. Scroll down to **Plugins** section
5. Find **Audit Logs**
6. Check ✓ the **Read** checkbox
7. Click **Save** (top right)

### Step 4: Test Auto-Logging
1. Go to **Content-Type Builder** (left sidebar)
2. Create a simple content type (or use existing one)
3. Go to **Content Manager**
4. Create/Edit some content
5. **Each action creates an audit log!**

### Step 5: Query Audit Logs via API

Open a **new terminal**:

```bash
# Login to get JWT token
curl -X POST http://localhost:1337/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_EMAIL@example.com",
    "password": "YOUR_PASSWORD"
  }'
```

Copy the `token` from response, then:

```bash
# Set your token
export TOKEN="paste_your_token_here"

# Get all audit logs
curl http://localhost:1337/admin/audit-logs/audit-logs \
  -H "Authorization: Bearer $TOKEN" | jq

# Filter by action
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=create" \
  -H "Authorization: Bearer $TOKEN" | jq

# Get statistics
curl http://localhost:1337/admin/audit-logs/audit-logs/stats \
  -H "Authorization: Bearer $TOKEN" | jq
```

## ✨ Expected Results

### After Creating Content:
```json
{
  "data": [
    {
      "id": 1,
      "contentType": "api::article.article",
      "recordId": "abc123",
      "action": "create",
      "userId": 1,
      "userName": "admin",
      "userEmail": "admin@example.com",
      "newData": {
        "title": "My Article",
        "content": "..."
      },
      "timestamp": "2024-10-25T11:45:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "total": 1
    }
  }
}
```

### After Updating Content:
```json
{
  "action": "update",
  "changedFields": ["title"],
  "previousData": {
    "title": "Old Title"
  },
  "newData": {
    "title": "New Title"
  }
}
```

## 🎯 Test Checklist

- [ ] Server started successfully
- [ ] Admin user created
- [ ] Audit Logs permission enabled
- [ ] Content created (triggers audit log)
- [ ] Content updated (shows changed fields)
- [ ] Content deleted (captures previous data)
- [ ] API endpoint accessible
- [ ] Filtering works
- [ ] Pagination works
- [ ] Statistics endpoint works

## 🐛 Troubleshooting

### Can't Access /api/audit-logs
**Solution**: Make sure you enabled the permission in Settings → Roles → Super Admin → Audit Logs → Read

### No Audit Logs Appearing
**Solution**: Check that the plugin is enabled in `config/plugins.ts`:
```typescript
'audit-logs': {
  enabled: true,
}
```

### Permission Denied
**Solution**: You need to login and use the JWT token in the Authorization header

## 🎉 Success Criteria

✅ Server runs without errors
✅ Plugin loads (you'll see "Audit Logs permissions registered" in console)
✅ Can enable permissions in admin panel
✅ Content changes are logged automatically
✅ API returns audit logs with proper structure
✅ Filtering and pagination work

---

## 📚 Full Documentation

- **Complete Guide**: `TESTING_GUIDE.md`
- **Plugin README**: `packages/plugins/audit-logs/README.md`
- **Architecture**: `DESIGN_NOTE.md`
- **Setup Guide**: `AUDIT_LOGS_SETUP.md`

---

**Node Version Used**: v20.19.4 ✅
**Status**: Ready to test! 🚀

