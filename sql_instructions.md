Please run the following SQL command in your Supabase SQL editor to support the notes feature:

```sql
ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
```

And for settings, there's no schema change since it's using the key-value JSON structure (`settings` table with `key` and `data` jsonb column).
