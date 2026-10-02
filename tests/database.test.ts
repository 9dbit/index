import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("schema applies and RLS denies cross-workspace reads and writes", async () => {
  const db = new PGlite();
  await db.exec(
    `create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  await db.exec(
    await readFile(
      "supabase/migrations/20261002201802_index_foundation.sql",
      "utf8",
    ),
  );
  const user = "00000000-0000-4000-a000-000000000001",
    other = "00000000-0000-4000-a000-000000000002",
    ws = "00000000-0000-4000-b000-000000000001",
    ws2 = "00000000-0000-4000-b000-000000000002";
  await db.exec(
    `insert into auth.users values('${user}'),('${other}');insert into workspaces(id,name)values('${ws}','Mine'),('${ws2}','Other');insert into workspace_members values('${ws}','${user}','editor'),('${ws2}','${other}','owner');insert into sites(workspace_id,name,domain,url,tier,niche)values('${ws}','Own site','own.example','https://own.example',2,'Tech'),('${ws2}','Other site','other.example','https://other.example',2,'Tech');set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`,
  );
  const { rows } = await db.query("select name from sites");
  assert.deepEqual(rows, [{ name: "Own site" }]);
  await assert.rejects(
    db.query(
      `insert into sites(workspace_id,name,domain,url,tier,niche)values('${ws2}','Attack','attack.example','https://attack.example',2,'Tech')`,
    ),
  );
  await assert.rejects(
    db.query(
      `update sites set workspace_id='${ws2}' where domain='own.example'`,
    ),
  );
  await db.exec("reset role");
  const { rows: rls } = await db.query<{ count: number }>(
    "select count(*)::int from pg_tables where schemaname='public' and not rowsecurity",
  );
  assert.equal(rls[0].count, 0);
  await db.close();
});
