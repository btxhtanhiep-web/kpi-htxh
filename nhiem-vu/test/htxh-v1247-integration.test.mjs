import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(appRoot, '..');
const load = p => readFileSync(join(appRoot,p),'utf8');
const rules = readFileSync(join(root,'firestore.htxh.v1.24.7-compatible.rules'),'utf8');
const build='20260916.V1_24_7_HTXH_1';
test('Tenant Firebase & name isolated from donor',()=>{
  assert.match(load('firebase-config.js'),/projectId:\s*"kpi-htxh-4b6e9"/);
  assert.doesNotMatch(load('firebase-config.js'),/quan-ly-nhiem-vu-tanhiep/);
  assert.match(load('index.html'),/Trung tâm Hỗ trợ xã hội/);
  assert.match(load('app-v3.js'),/Trung tâm Hỗ trợ xã hội/);
  const manifest=JSON.parse(load('manifest.webmanifest'));
  assert.match(manifest.name,/Hỗ trợ xã hội/);
  assert.match(manifest.description,/Hỗ trợ xã hội/);
});
test('Known departments and stored coordinator role preserved',()=>{
  const deps=load('services/department-read-service.js');
  for (const id of ['BGD','TCKT','CTXH','KQLCS']) assert.match(deps,new RegExp('"'+id+'"'));
  for (const id of ['"TCHC"','"KHTC"','"YT"','"KI"','"KII"','"KIII"']) assert.doesNotMatch(deps,new RegExp(id));
  assert.match(rules,/roleIs\("TCHC_COORDINATOR"\)/);
  assert.match(rules,/sameDepartment\("TCKT"\)/);
  assert.doesNotMatch(rules,/sameDepartment\("TCHC"\)/);
});
test('3 XLSX paths present: M01-A/B and donor 13-column',()=>{
  const wf=load('modules/kpi/kpi-workflow.js');
  assert.match(wf,/criterionExportRows = criteria\.map/);
  assert.match(wf,/await exportM01TemplateWorkbook\(\{/);
  assert.match(wf,/exportDepartmentSummaryWorkbook\(\{/);
  assert.match(wf,/exportReportXlsx\(/);
  assert.match(wf,/import \{ exportDomToDocx \}/);
  assert.match(load('services/xlsx-export-service.js'),/export function exportDepartmentSummaryWorkbook\(/);
});
test('Unique build identity, shared core and SW cache, UI version',()=>{
  const core=load('core/app-version.js');const sw=load('sw.js');const html=load('index.html');
  for (const value of [core,sw,html,load('app-v3.js'),load('pwa.js')]) assert.ok(value.includes(build));
  assert.match(core,/CACHE_NAME = "nhiem-vu-20260916-v1-24-7-htxh-1"/);
  assert.doesNotMatch(sw,/-department-excel-v1247/);
  assert.match(html,/V1\.24\.7-HTXH/);
});
test('Notifications OFF from rules; operational logs unchanged',()=>{
  for (const coll of ['executivePushSubscriptions','executiveNotificationLogs','taskPushSubscriptions'])
    assert.match(rules,new RegExp('match /'+coll+'\\/\\{[^}]+\\}\\s*\\{\\s*allow read, write: if false;'));
  assert.match(rules,/match \/userNotifications\/\{recipientUserId\}\/items\/\{notificationId\} \{\s*allow read, write: if false;/);
  assert.match(rules,/match \/taskLogs\/\{logId\}/);
  assert.match(rules,/match \/kpiAuditLogs\/\{auditId\}/);
  assert.match(load('services/user-notification-service.js'),/OFF|Notification/);
});
