# Testing the Audit Logs Plugin - Quick Guide

## ✅ Setup Complete!

The plugin is now configured in `examples/empty/config/plugins.ts` and ready to test.

## 🚀 Method 1: Start Strapi and Test Manually

### Step 1: Start the Development Server

```bash
cd /Users/abjaiswal/Repository/Personal/strapi-assignment/examples/empty
yarn develop
```

Wait for Strapi to start (you'll see "Welcome to Strapi!" in the console).

### Step 2: Create Admin User

1. Open browser: http://localhost:1337/admin
2. Create your first admin user (fill the form)
3. You'll be logged into the admin panel

### Step 3: Enable Audit Logs Permission

1. In admin panel, go to: **Settings** → **Roles** (under Administration Panel)
2. Click on **Super Admin**
3. Scroll down to **Plugins** section
4. Find **Audit Logs** and check the **Read** permission
5. Click **Save** (top right)

### Step 4: Create a Content Type (if not already exists)

1. Go to **Content-Type Builder** (left sidebar)
2. Create a new Collection Type called "Article":
   - Click **"Create new collection type"**
   - Name: `article`
   - Add fields:
     - `title` (Text, Short text)
     - `content` (Rich text)
   - Click **Save** and restart when prompted

### Step 5: Create/Update Content

1. Go to **Content Manager** → **Article**
2. Click **"Create new entry"**
3. Fill in title and content
4. Click **Save**
5. Edit the article and change something
6. Save again

🎯 **Each of these actions should create an audit log entry!**

### Step 6: Check Audit Logs via API

Open a new terminal and test the API:

#### Get Authentication Token First

```bash
# Login to get JWT token
curl -X POST http://localhost:1337/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-admin-email@example.com",
    "password": "your-password"
  }'
```

Copy the `token` from the response.

#### Query Audit Logs

```bash
# Replace YOUR_TOKEN with the actual token
export TOKEN="YOUR_TOKEN_HERE"

# Get all audit logs
curl http://localhost:1337/api/audit-logs/audit-logs \
  -H "Authorization: Bearer $TOKEN"

# Get audit logs for articles
curl "http://localhost:1337/api/audit-logs/audit-logs?contentType=api::article.article" \
  -H "Authorization: Bearer $TOKEN"

# Get only create actions
curl "http://localhost:1337/api/audit-logs/audit-logs?action=create" \
  -H "Authorization: Bearer $TOKEN"

# Get statistics
curl http://localhost:1337/api/audit-logs/audit-logs/stats \
  -H "Authorization: Bearer $TOKEN"

# Get with pagination
curl "http://localhost:1337/api/audit-logs/audit-logs?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Step 7: Verify the Logs

The API response should show:

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "...",
      "contentType": "api::article.article",
      "recordId": "1",
      "action": "create",
      "userId": 1,
      "userName": "admin",
      "userEmail": "admin@example.com",
      "changedFields": null,
      "previousData": null,
      "newData": {
        "title": "My Article",
        "content": "..."
      },
      "timestamp": "2024-10-25T...",
      ...
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

## 🧪 Method 2: Database Direct Check

If you want to verify the data is actually in the database:

```bash
# Navigate to the example project
cd /Users/abjaiswal/Repository/Personal/strapi-assignment/examples/empty

# Open SQLite database (if using SQLite)
sqlite3 .tmp/data.db

# Run SQL query
SELECT * FROM audit_logs;

# Exit
.quit
```

## 🎯 Method 3: Test All Features

### Test 1: Create Operation
```bash
# Create a new article via API
curl -X POST http://localhost:1337/api/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data": {
      "title": "Test Article",
      "content": "This is a test"
    }
  }'

# Check audit log - should show "create" action
curl "http://localhost:1337/api/audit-logs/audit-logs?action=create" \
  -H "Authorization: Bearer $TOKEN"
```

### Test 2: Update Operation
```bash
# Update the article (replace :id with actual article ID)
curl -X PUT http://localhost:1337/api/articles/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data": {
      "title": "Updated Title"
    }
  }'

# Check audit log - should show "update" action with changedFields: ["title"]
curl "http://localhost:1337/api/audit-logs/audit-logs?action=update" \
  -H "Authorization: Bearer $TOKEN"
```

### Test 3: Delete Operation
```bash
# Delete the article
curl -X DELETE http://localhost:1337/api/articles/1 \
  -H "Authorization: Bearer $TOKEN"

# Check audit log - should show "delete" action
curl "http://localhost:1337/api/audit-logs/audit-logs?action=delete" \
  -H "Authorization: Bearer $TOKEN"
```

### Test 4: Filter by Date Range
```bash
# Get logs from today
curl "http://localhost:1337/api/audit-logs/audit-logs?startDate=2024-10-25T00:00:00.000Z" \
  -H "Authorization: Bearer $TOKEN"
```

### Test 5: Get Statistics
```bash
curl http://localhost:1337/api/audit-logs/audit-logs/stats \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "data": {
    "total": 15,
    "byAction": {
      "create": 5,
      "update": 8,
      "delete": 2
    },
    "byContentType": {
      "api::article.article": 15
    }
  }
}
```

## ✅ What to Verify

After testing, you should see:

1. ✅ **Audit logs are created automatically** when you create/update/delete content
2. ✅ **User information is captured** (your admin user ID, name, email)
3. ✅ **Changed fields are tracked** in update operations
4. ✅ **Previous and new data** are stored
5. ✅ **Filtering works** by content type, action, date, user
6. ✅ **Pagination works** correctly
7. ✅ **Statistics are accurate**
8. ✅ **Permissions are enforced** (try accessing without token - should fail)

## 🐛 Troubleshooting

### Issue: "Cannot find module '@strapi/plugin-audit-logs'"

**Solution**: Make sure you ran `yarn install` from the project root.

### Issue: "Permission denied" when accessing audit logs

**Solution**: 
1. Go to Settings → Roles → Super Admin
2. Enable "Audit Logs" → "Read" permission
3. Save

### Issue: No audit logs appearing

**Solution**:
1. Check plugin is enabled in `config/plugins.ts`
2. Check Strapi logs for errors: look for "Audit Logs plugin initialized"
3. Verify you're creating/updating content through Strapi (not directly in DB)

### Issue: Audit logs showing but no user information

**Solution**: This is normal for:
- Operations performed by system/cron jobs
- Operations before user login
- Database migrations

## 📊 Success Criteria

Your testing is successful if:

- ✅ Plugin loads without errors
- ✅ Audit logs table is created in database
- ✅ Content changes are logged automatically
- ✅ API endpoints return data with proper structure
- ✅ Filtering and pagination work
- ✅ Permissions are enforced
- ✅ User information is captured correctly
- ✅ Changed fields are identified in updates

## 🎉 Next Steps

Once testing is complete:

1. Review the plugin code in `packages/plugins/audit-logs/`
2. Read the architecture docs in `DESIGN_NOTE.md`
3. Check the comprehensive README in the plugin directory
4. Test edge cases (bulk operations, relations, etc.)
5. Review performance with large datasets

## 📝 Test Results Template

Document your results:

```
TEST RESULTS
============

Environment:
- Node version: ___
- Strapi version: ___
- Database: SQLite/PostgreSQL/MySQL

Tests Performed:
[ ] Plugin installation
[ ] Create operation logging
[ ] Update operation logging
[ ] Delete operation logging
[ ] API endpoint access
[ ] Filtering by content type
[ ] Filtering by action
[ ] Filtering by date range
[ ] Pagination
[ ] Sorting
[ ] Statistics endpoint
[ ] Permission enforcement

Issues Found:
- None / [List any issues]

Performance:
- Response time: ___ ms
- Database size after 100 operations: ___ MB

Conclusion:
- PASS / FAIL
- Notes: ___
```

---

**Plugin Version**: 1.0.0  
**Last Updated**: October 25, 2024

