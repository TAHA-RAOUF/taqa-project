# Action Plan API Troubleshooting Guide

## Issues Fixed

We've identified and fixed several key issues with the action plan API:

1. **406 Not Acceptable Error** when fetching action plans
2. **Ambiguous column reference error** when creating action items
3. **PGRST116 Error** (no rows found) when updating anomalies
4. **LockManager warning** (not critical, related to browser support)

## Step-by-Step Fix Instructions

### 1. Run the Database Fix Script

First, run the comprehensive database fix script to rebuild tables and policies properly:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire content of `/home/moraouf/goinfre/project/supabase/fix_all_database_issues.sql`
4. Run the script
5. Check the output for any errors

This script will:
- Create backups of existing data
- Drop and recreate the action_plans and action_items tables
- Create proper indexes
- Set up simplified RLS policies
- Add triggers for updated_at timestamps
- Fix the ambiguous column issue
- Restore data from backups

### 2. Update Frontend Code

The following files have been updated to fix issues with the API:

- **src/lib/supabase.ts**: Added proper headers to fix 406 errors
- **src/services/supabaseActionPlanService.ts**: Fixed ambiguous column issues in queries
- **src/services/anomalyService.ts**: Added check for anomaly existence before updating
- **src/contexts/DataContext.tsx**: Improved error handling for action plan creation

### 3. Test Using the Diagnostic Tool

We've created a diagnostic tool to help verify the fixes:

1. Open your browser console in the application
2. Copy and paste the code from `/home/moraouf/goinfre/project/src/test/actionPlanDiagnosticTool.js`
3. The tool will run automatically and test API operations
4. Follow the output in the console to diagnose any remaining issues

### 4. If Issues Persist

If the 406 error persists after applying these fixes:

#### Check API Headers

1. Open your Network tab in Developer Tools
2. Look for requests to `action_plans`
3. Verify these headers are present:
   - `Accept: application/json`
   - `Content-Type: application/json` 
   - `Authorization: Bearer <token>`

#### Check Database Structure

Run these SQL queries in the SQL Editor:

```sql
-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'action_plans';

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'action_plans';

-- Check for any conflicts in column names
SELECT 
  c1.table_name, c1.column_name, c2.table_name, c2.column_name
FROM 
  information_schema.columns c1
  JOIN information_schema.columns c2 ON c1.column_name = c2.column_name 
WHERE 
  c1.table_schema = 'public' AND
  c2.table_schema = 'public' AND
  c1.table_name != c2.table_name AND
  c1.table_name IN ('action_plans', 'action_items') AND
  c2.table_name IN ('action_plans', 'action_items');
```

#### Test with cURL

Test the API directly with cURL to bypass browser/JavaScript issues:

```bash
curl -X GET "https://zhljmjqhfsvdmgyhbebw.supabase.co/rest/v1/action_plans?select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: application/json"
```

## Understanding the Fixed Errors

### 406 Not Acceptable

This error occurs when the server cannot generate a response matching the Accept header sent by the client. We fixed this by:

1. Adding explicit Accept headers to all requests
2. Simplifying RLS policies to avoid conflicts
3. Making sure table structure matches API expectations

### Ambiguous Column Reference

The error "column reference completion_percentage is ambiguous" occurs when both tables in a join have columns with the same name. We fixed this by:

1. Using explicit column selection in queries
2. Adding table name qualifiers to column references
3. Creating a trigger function to handle insertions properly

### PGRST116 Error

This error indicates "no rows returned" when a single row was expected. We fixed this by:

1. Adding explicit checks for record existence before updates
2. Handling the case where `.single()` might not find a record
3. Properly returning the first item from array responses

## Preventing Future Issues

1. Always use explicit headers in Supabase API requests
2. Avoid column name conflicts between related tables
3. Check for record existence before updates
4. Use `.select('*')` instead of `.select()` to be explicit
5. Keep RLS policies simple and non-conflicting

## Testing the Fix

After applying all fixes:

1. Create a new action plan for an anomaly
2. Navigate away from the page and return to verify it loads correctly
3. Edit the action plan and verify changes persist
4. Check the database directly to confirm data is stored correctly
