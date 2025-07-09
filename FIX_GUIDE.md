# How to Fix the Action Plans Table Issue

## The Problem
You're getting the error: `ERROR: 42703: column "priority" does not exist` when trying to run the migration.

## Solution Steps

### Step 1: Use the Manual SQL Script
Instead of using the migration files, run the manual SQL script directly in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the content from `supabase/manual_create_action_plans.sql`
4. Run the script

### Step 2: Verify the Tables Were Created
After running the script, check if the tables were created successfully:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('action_plans', 'action_items');

-- Check action_plans table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'action_plans'
ORDER BY ordinal_position;
```

### Step 3: Test the Application
Once the tables are created:

1. Restart your frontend application
2. Try creating an action plan through the UI
3. Check the logs in `/logs` page to see if logging is working

### Step 4: Alternative - Delete Migration Files
If the migration system is causing issues, you can:

1. Delete the problematic migration files:
   - `supabase/migrations/004_create_action_plans_table.sql`
   - `supabase/migrations/005_create_action_plans_simple.sql`

2. Use only the manual script approach

### Step 5: Environment Variables
Make sure your environment variables are set correctly:

```bash
# Check your .env file for:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## What This Fixes

1. **Logging Service**: Now properly logs all user actions to the database
2. **Action Plan Management**: Stores action plans in the database instead of memory
3. **Data Persistence**: Action plans survive application restarts
4. **Error Handling**: Better error handling and logging

## Files Modified

- `src/contexts/DataContext.tsx` - Added logging and updated action plan functions
- `src/services/supabaseActionPlanService.ts` - New service for action plan CRUD operations
- `src/services/loggingService.ts` - Enhanced logging with better error handling
- `supabase/manual_create_action_plans.sql` - Manual table creation script

## Testing

Run the test file to verify everything works:
```typescript
// In browser console or create a test component
import { runTests } from './src/test/serviceTests';
runTests();
```

This will test both the logging service and action plan service.
