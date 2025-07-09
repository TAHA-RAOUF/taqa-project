# Action Plans API Troubleshooting Guide

## Problem: 406 Not Acceptable Error

You're getting a 406 (Not Acceptable) error when trying to fetch action plans from Supabase:

```
GET https://zhljmjqhfsvdmgyhbebw.supabase.co/rest/v1/action_plans?select=*&anomaly_id=eq.8098de33-14bf-487c-9e27-2495140c09f0 406 (Not Acceptable)
```

## Root Causes and Solutions

### 1. Inconsistent Headers

**Problem**: The Supabase REST API expects specific headers for requests.

**Solution**:
- We've updated the Supabase client to include proper headers:
  ```javascript
  export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    },
  });
  ```

### 2. Row Level Security (RLS) Issues

**Problem**: Complex or conflicting RLS policies can cause 406 errors.

**Solution**:
- Run the SQL script `supabase/fix_action_plans_406_error.sql` in the Supabase SQL Editor
- This script cleans up old policies and creates simple ones that allow full access

### 3. Table Structure Issues

**Problem**: Different migration scripts might have created inconsistent table structures.

**Solution**:
- Use the `manual_create_action_plans.sql` script to ensure a consistent table structure
- Check the table structure in Supabase to ensure it has all required columns

### 4. Request Format Issues

**Problem**: The API endpoint expects specific query parameters.

**Solution**: 
- Make sure all queries use the exact field names from the database
- Use `anomaly_id` (not `anomalyId`) in query parameters

## Testing the Fix

1. Run the test script in your browser console:
   ```javascript
   // Load the test script
   const script = document.createElement('script');
   script.src = '/src/test/testActionPlanAPI.js';
   document.head.appendChild(script);
   ```

2. Manually test in the Supabase SQL Editor:
   ```sql
   -- Check if action plans exist for a specific anomaly
   SELECT * FROM action_plans WHERE anomaly_id = 'your-anomaly-id';
   
   -- Create a test action plan if none exists
   INSERT INTO action_plans (anomaly_id, needs_outage, priority, comments, status)
   VALUES ('your-anomaly-id', true, 3, 'Test plan', 'draft');
   ```

3. Check the browser network tab to confirm requests are sending proper headers

## Prevention

1. Always include proper Accept headers with Supabase requests
2. Use simplified RLS policies when possible
3. Maintain consistent table naming conventions across migrations
4. Use transaction blocks in migrations to prevent partial migrations

## If Issues Persist

1. Check for console errors related to authentication
2. Verify that you're properly authenticated with Supabase
3. Try accessing the table through the Supabase dashboard to verify it exists
4. Check if other API endpoints are working correctly
5. Verify all environment variables are correctly set
