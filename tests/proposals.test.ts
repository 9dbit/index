import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const foundation = "supabase/migrations/20261002201802_index_foundation.sql";
const proposals = "supabase/migrations/20261003205122_proposal_workflow.sql";

async function database() {
  const db = new PGlite();
  await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  await db.exec(await readFile(foundation, "utf8"));
  await db.exec(await readFile(proposals, "utf8"));
  return db;
}

test("editors propose, owners decide, approved proposals create one draft", async () => {
  const db = await database();
  const owner = "00000000-0000-4000-a000-000000000001";
  const editor = "00000000-0000-4000-a000-000000000002";
  const ws = "00000000-0000-4000-b000-000000000001";
  await db.exec(`insert into auth.users values('${owner}'),('${editor}');insert into workspaces(id,name) values('${ws}','INDEX');insert into workspace_members values('${ws}','${owner}','owner'),('${ws}','${editor}','editor');insert into sites(workspace_id,name,domain,url,tier,niche) values('${ws}','Site','site.example','https://site.example',2,'Test');`);
  const { rows: sites } = await db.query<{id:string}>("select id from sites where domain='site.example'");
  const site = sites[0].id;
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${editor}',false);`);
  await db.query(`insert into proposals(workspace_id,site_id,title,rationale,created_by) values('${ws}','${site}','Refresh landing page','Reviewed content change proposal.','${editor}')`);
  const { rows: created } = await db.query<{id:string;status:string}>("select id,status from proposals");
  assert.equal(created[0].status,"proposed");
  await db.query(`update proposals set status='approved',decided_by='${editor}',decided_at=now() where id='${created[0].id}'`);
  const { rows: editorDecision } = await db.query<{status:string}>(`select status from proposals where id='${created[0].id}'`);
  assert.equal(editorDecision[0].status,"proposed");
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);`);
  await db.query(`update proposals set status='approved',decided_by='${owner}',decided_at=now() where id='${created[0].id}'`);
  await db.exec(`select set_config('request.jwt.claim.sub','${editor}',false);`);
  await db.query(`insert into content_items(workspace_id,site_id,proposal_id,topic,state) values('${ws}','${site}','${created[0].id}','Approved draft','Draft')`);
  await assert.rejects(db.query(`insert into content_items(workspace_id,site_id,proposal_id,topic,state) values('${ws}','${site}','${created[0].id}','Duplicate draft','Draft')`));
  await db.close();
});

test("manual proposal policy rejects fabricated measured source", async () => {
  const db = await database();
  const editor = "00000000-0000-4000-a000-000000000003";
  const ws = "00000000-0000-4000-b000-000000000003";
  await db.exec(`insert into auth.users values('${editor}');insert into workspaces(id,name) values('${ws}','INDEX');insert into workspace_members values('${ws}','${editor}','editor');insert into sites(workspace_id,name,domain,url,tier,niche) values('${ws}','Site','guard.example','https://guard.example',2,'Test');`);
  const { rows: sites } = await db.query<{id:string}>("select id from sites where domain='guard.example'");
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${editor}',false);`);
  await assert.rejects(db.query(`insert into proposals(workspace_id,site_id,title,rationale,source,created_by) values('${ws}','${sites[0].id}','Fake measured proposal','This must not claim automated evidence.','measured_gsc','${editor}')`));
  await db.close();
});
