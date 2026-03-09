import re

file_path = "src/lib/services/supabaseService.ts"
with open(file_path, "r") as f:
    content = f.read()

new_method = """  async clearDataByDate(date: string): Promise<boolean> {
    try {
      const tables = [
        "appointments",
        "car_wash_records",
        "daily_reports",
        "daily_roles",
      ];

      for (const t of tables) {
        // daily_reports uses "id" as the date field
        const column = t === "daily_reports" ? "id" : "date";
        const { error } = await supabaseAdmin
          .from(t)
          .delete()
          .eq(column, date);

        if (error) {
          logSupabaseError(`database.clearDataByDate - table ${t}`, error);
          return false;
        }
      }
      return true;
    } catch (e) {
      logSupabaseError("database.clearDataByDate", e);
      return false;
    }
  },"""

if "async clearDataByDate" not in content:
    content = content.replace("async clearAllData(): Promise<boolean> {", new_method + "\n  async clearAllData(): Promise<boolean> {")
    with open(file_path, "w") as f:
        f.write(content)
    print("Added clearDataByDate")
else:
    print("Already exists")
