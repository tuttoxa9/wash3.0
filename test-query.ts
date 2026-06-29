import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function test() {
  const { data, error } = await supabase
    .from("okleyka_orders")
    .select(`
      *,
      okleyka_order_items (*),
      okleyka_order_workers (*)
    `)
    .limit(1);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", JSON.stringify(data, null, 2));
  }
}

test();
