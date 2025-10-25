# 🧪 Test Your Audit Logs Plugin - Step by Step

**Strapi is running at:** http://localhost:1337/admin

Let's test every feature of your audit logs plugin!

---

## 📋 Test Checklist

- [ ] Step 1: Enable Audit Logs Permissions
- [ ] Step 2: Create Test Content Type
- [ ] Step 3: Verify Auto-Logging Works
- [ ] Step 4: Test API Endpoints
- [ ] Step 5: Test Filtering
- [ ] Step 6: Test Statistics
- [ ] Step 7: Test Updates & Deletes

---

## Step 1: Enable Audit Logs Permissions 🔐

1. **Open the Admin Panel:**
   ```
   http://localhost:1337/admin
   ```
   ✅ You should already be logged in

2. **Navigate to Roles:**
   - Click **Settings** (⚙️ icon in left sidebar)
   - Under "Administration Panel" section
   - Click **Roles**

3. **Edit Super Admin Role:**
   - Click on **Super Admin**
   - Scroll down to the **Plugins** section
   - Find **Audit Logs** plugin
   - ✅ Check the box next to **Read**
   - Click **Save** (blue button top right)

**✅ Success:** You'll see a green "Saved" notification

---

## Step 2: Create Test Content Type 📝

1. **Open Content-Type Builder:**
   - Click **Content-Type Builder** in left sidebar (🏗️ icon)

2. **Create a New Collection Type:**
   - Click **+ Create new collection type**
   - Display name: `Article`
   - Click **Continue**

3. **Add Fields:**
   
   **Field 1: Title**
   - Click **+ Add another field**
   - Select **Text** (short text)
   - Name: `title`
   - Click **+ Add another field**
   
   **Field 2: Content**
   - Select **Rich text**
   - Name: `content`
   - Click **Finish**

4. **Save:**
   - Click **Save** (top right)
   - Wait for Strapi to restart (about 10 seconds)

**✅ Success:** You'll see "Saved successfully" message

---

## Step 3: Verify Auto-Logging Works ✨

### Create Your First Article

1. **Go to Content Manager:**
   - Click **Content Manager** in left sidebar

2. **Select Article:**
   - In the left panel, click **Article** (under COLLECTION TYPES)

3. **Create New Article:**
   - Click **+ Create new entry** (blue button, top right)
   - Fill in:
     - Title: `My First Article`
     - Content: `This is a test article to verify audit logging works!`
   - Click **Save** (top right)

**🎉 This just created an audit log!**

### Verify in Database

Open a new terminal and check:

```bash
# Check the SQLite database
cd /Users/abjaiswal/Repository/Personal/strapi-assignment/examples/empty
sqlite3 .tmp/data.db "SELECT * FROM audit_logs;" | head -20
```

**Expected Output:** You should see a row with:
- `contentType`: `api::article.article`
- `action`: `create`
- `timestamp`: Current time
- `newData`: JSON with your article data

---

## Step 4: Test API Endpoints 🌐

### Get Your JWT Token

**Option A: From Browser DevTools**
1. Open browser DevTools (F12)
2. Go to **Application** tab → **Local Storage**
3. Find `jwtToken` - copy its value

**Option B: Login via API**

Open a new terminal:

```bash
# Login (use the credentials you registered with)
curl -X POST http://localhost:1337/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_EMAIL@example.com",
    "password": "YOUR_PASSWORD"
  }' | jq
```

Copy the `data.token` value from the response.

### Set Your Token

```bash
# Replace with your actual token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Test: Get All Audit Logs

```bash
curl http://localhost:1337/admin/audit-logs/audit-logs \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123...",
      "contentType": "api::article.article",
      "recordId": "xyz...",
      "action": "create",
      "timestamp": "2025-10-25T...",
      "user": {
        "id": 1,
        "name": "Your Name",
        "email": "your@email.com"
      },
      "newData": {
        "title": "My First Article",
        "content": "This is a test...",
        ...
      },
      "changedFields": [],
      "previousData": null,
      "createdAt": "2025-10-25T...",
      "updatedAt": "2025-10-25T..."
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

**✅ Success:** You see audit logs with your article creation!

### Test: Get Single Audit Log

```bash
# Get the first log (replace ID with actual ID from previous response)
curl http://localhost:1337/admin/audit-logs/audit-logs/1 \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Same data as above but for single log

### Test: Get Statistics

```bash
curl http://localhost:1337/admin/audit-logs/audit-logs/stats \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "data": {
    "total": 1,
    "byAction": {
      "create": 1
    },
    "byContentType": {
      "api::article.article": 1
    }
  }
}
```

---

## Step 5: Test Filtering 🔍

### Create More Test Data First

Go back to the admin panel and:
1. Create 2-3 more articles
2. Update one of them (edit and save)
3. Delete one article

Now you have logs with different actions!

### Filter by Action

```bash
# Get only 'create' actions
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=create" \
  -H "Authorization: Bearer $TOKEN" | jq

# Get only 'update' actions
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=update" \
  -H "Authorization: Bearer $TOKEN" | jq

# Get only 'delete' actions
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=delete" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Filter by Content Type

```bash
curl "http://localhost:1337/admin/audit-logs/audit-logs?contentType=api::article.article" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Filter by Date Range

```bash
# Get logs from today
TODAY=$(date +%Y-%m-%d)
curl "http://localhost:1337/admin/audit-logs/audit-logs?startDate=${TODAY}T00:00:00.000Z" \
  -H "Authorization: Bearer $TOKEN" | jq

# Get logs from last hour
HOUR_AGO=$(date -u -v-1H +%Y-%m-%dT%H:%M:%S.000Z)
curl "http://localhost:1337/admin/audit-logs/audit-logs?startDate=${HOUR_AGO}" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Filter by User

```bash
# Replace with your user ID (usually 1)
curl "http://localhost:1337/admin/audit-logs/audit-logs?userId=1" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Combine Multiple Filters

```bash
# Get all 'create' actions for articles from today
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=create&contentType=api::article.article&startDate=${TODAY}T00:00:00.000Z" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Step 6: Test Pagination & Sorting 📄

### Test Pagination

```bash
# Page 1, 2 items per page
curl "http://localhost:1337/admin/audit-logs/audit-logs?page=1&pageSize=2" \
  -H "Authorization: Bearer $TOKEN" | jq

# Page 2, 2 items per page
curl "http://localhost:1337/admin/audit-logs/audit-logs?page=2&pageSize=2" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Test Sorting

```bash
# Sort by timestamp descending (newest first)
curl "http://localhost:1337/admin/audit-logs/audit-logs?sort=timestamp:desc" \
  -H "Authorization: Bearer $TOKEN" | jq

# Sort by timestamp ascending (oldest first)
curl "http://localhost:1337/admin/audit-logs/audit-logs?sort=timestamp:asc" \
  -H "Authorization: Bearer $TOKEN" | jq

# Sort by action
curl "http://localhost:1337/admin/audit-logs/audit-logs?sort=action:asc" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Step 7: Test Update & Delete Logging 🔄

### Test Update Logging

1. **Go to Content Manager**
2. **Edit an Article:**
   - Click on one of your articles
   - Change the title from "My First Article" to "Updated Article"
   - Click **Save**

3. **Check the Audit Log:**

```bash
# Get latest logs (sorted by timestamp desc)
curl "http://localhost:1337/admin/audit-logs/audit-logs?sort=timestamp:desc&pageSize=1" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "data": [
    {
      "action": "update",
      "changedFields": ["title"],
      "previousData": {
        "title": "My First Article",
        ...
      },
      "newData": {
        "title": "Updated Article",
        ...
      }
    }
  ]
}
```

**✅ Notice:** 
- `changedFields` shows `["title"]`
- `previousData` has old value
- `newData` has new value

### Test Delete Logging

1. **Delete an Article:**
   - Go to Content Manager
   - Click on an article
   - Click **Delete** (red button)
   - Confirm deletion

2. **Check the Audit Log:**

```bash
curl "http://localhost:1337/admin/audit-logs/audit-logs?action=delete" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "data": [
    {
      "action": "delete",
      "previousData": {
        "title": "Deleted Article",
        "content": "...",
        ...
      },
      "newData": null
    }
  ]
}
```

**✅ Notice:** `previousData` has the deleted article data

---

## Step 8: Test Statistics with Real Data 📊

```bash
curl http://localhost:1337/admin/audit-logs/audit-logs/stats \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "data": {
    "total": 8,
    "byAction": {
      "create": 5,
      "update": 2,
      "delete": 1
    },
    "byContentType": {
      "api::article.article": 7,
      "plugin::users-permissions.user": 1
    }
  }
}
```

---

## Step 9: Test Permission Control 🔒

### Test Without Permission

1. **Remove Permission:**
   - Settings → Roles → Super Admin
   - **Uncheck** Audit Logs → Read
   - Save

2. **Try to Access API:**

```bash
curl http://localhost:1337/admin/audit-logs/audit-logs \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected Response:**
```json
{
  "error": {
    "status": 403,
    "name": "ForbiddenError",
    "message": "Forbidden"
  }
}
```

**✅ Success:** Permission system works!

3. **Re-enable Permission:**
   - Settings → Roles → Super Admin
   - **Check** Audit Logs → Read
   - Save

---

## Step 10: Test Configuration Options ⚙️

### Test Excluding Content Types

1. **Edit Plugin Config:**

```bash
# Edit the config file
cat > /Users/abjaiswal/Repository/Personal/strapi-assignment/examples/empty/config/plugins.ts << 'EOF'
export default {
  'audit-logs': {
    enabled: true,
    config: {
      excludeContentTypes: ['api::article.article'],
    },
  },
};
EOF
```

2. **Restart Strapi:**

```bash
# Stop current process
pkill -f "yarn develop"

# Start again
cd /Users/abjaiswal/Repository/Personal/strapi-assignment/examples/empty
source ~/.nvm/nvm.sh && nvm use 20.19.4
nohup yarn develop > /tmp/strapi.log 2>&1 &

# Wait for startup
sleep 20
```

3. **Create a New Article:**
   - Go to Content Manager
   - Create a new article
   - Save

4. **Check Audit Logs:**

```bash
curl "http://localhost:1337/admin/audit-logs/audit-logs?contentType=api::article.article&sort=timestamp:desc&pageSize=1" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** No new log created (article is excluded)

5. **Restore Config:**

```bash
cat > /Users/abjaiswal/Repository/Personal/strapi-assignment/examples/empty/config/plugins.ts << 'EOF'
export default {
  'audit-logs': {
    enabled: true,
  },
};
EOF

# Restart Strapi again
pkill -f "yarn develop"
cd /Users/abjaiswal/Repository/Personal/strapi-assignment/examples/empty
source ~/.nvm/nvm.sh && nvm use 20.19.4
nohup yarn develop > /tmp/strapi.log 2>&1 &
```

---

## 🎯 Complete Test Checklist

Mark off as you test:

- [x] ✅ Enabled permissions
- [x] ✅ Created test content type
- [x] ✅ Verified auto-logging on create
- [x] ✅ Tested API: Get all logs
- [x] ✅ Tested API: Get single log
- [x] ✅ Tested API: Get statistics
- [x] ✅ Tested filtering by action
- [x] ✅ Tested filtering by content type
- [x] ✅ Tested filtering by date range
- [x] ✅ Tested filtering by user
- [x] ✅ Tested combined filters
- [x] ✅ Tested pagination
- [x] ✅ Tested sorting
- [x] ✅ Tested update logging (changed fields)
- [x] ✅ Tested delete logging
- [x] ✅ Tested permission control
- [x] ✅ Tested configuration options

---

## 🎉 All Tests Passing?

If you completed all steps and everything works, **congratulations!** Your audit logs plugin is:

✅ Automatically logging all content changes
✅ Capturing all required metadata
✅ Providing a working REST API
✅ Implementing proper permissions
✅ Supporting filtering and pagination
✅ Tracking field changes
✅ Configurable and production-ready

---

## 📸 Screenshot This for Documentation

Take screenshots of:
1. ✅ Admin panel showing audit logs permission enabled
2. ✅ API response showing audit logs with data
3. ✅ Statistics endpoint response
4. ✅ Update log showing `changedFields`

---

## 🐛 Troubleshooting

### Can't Access API (403 Forbidden)
**Solution:** Make sure permission is enabled (Step 1)

### No Logs Appearing
**Solution:** Check `/tmp/strapi.log` for errors

### Token Expired
**Solution:** Get a new token via login API

### Server Not Responding
**Solution:** Check if running: `ps aux | grep strapi`

---

## 🚀 Ready to Ship?

All tests passing? Push to GitHub:

```bash
cd /Users/abjaiswal/Repository/Personal/strapi-assignment
git push origin develop
```

**Your assignment is complete!** 🎊

