import fs from 'fs';

const filePath = 'src/lib/hooks/useRealtimeSync.ts';
let content = fs.readFileSync(filePath, 'utf-8');

const searchStr = `          if (payload.new && "key" in payload.new) {
            const key = (payload.new as any).key;
            const data = (payload.new as any).data;

            if (key === "realtimeEnabled") {
              const isEnabled = data?.isEnabled ?? true;
              dispatch({ type: "SET_REALTIME_ENABLED", payload: isEnabled });
            } else if (key === "safeBalance" && state.isRealtimeEnabled) {
              dispatch({ type: "SET_SAFE_BALANCE", payload: data?.balance ?? 0 });
            } else if (key === "safeTransactions" && state.isRealtimeEnabled) {
              dispatch({ type: "SET_SAFE_TRANSACTIONS", payload: data?.transactions ?? [] });
            }
          }`;

const replaceStr = `          if (payload.new && "key" in payload.new) {
            const key = (payload.new as any).key;
            const data = (payload.new as any).data;

            if (key === "realtimeEnabled") {
              const isEnabled = data?.isEnabled ?? true;
              dispatch({ type: "SET_REALTIME_ENABLED", payload: isEnabled });
            }
          }`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Successfully updated ${filePath}`);
} else {
  console.error(`Could not find search block in ${filePath}`);
}
