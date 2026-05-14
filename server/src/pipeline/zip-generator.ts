import { SupabaseClient } from '@supabase/supabase-js';
import { Writable } from 'stream';
import React from 'react';

export interface AdrRecord { number: string; slug: string; content: string; }
export interface EnvFiles { frontend: string; backend: string; example: string; }

const STAGE_NAMES: Record<number, string> = {
  0:  'P0 Idea Validation',
  1:  'P0.5 Feature Discovery',
  2:  'S1 Product Spec',
  3:  'S2 Architecture',
  4:  'S3 Data Architecture',
  5:  'S4 Backend & API',
  6:  'S5 Frontend & Client',
  7:  'S6 QA & Testing',
  8:  'S7 Security',
  9:  'S8 Infrastructure',
  10: 'S9 Performance',
  11: 'S10 Deployment',
  12: 'S11 Handover',
};

function getPdfFilename(slug: string, version: number): string {
  const date = new Date().toISOString().split('T')[0];
  return slug + '_specification_v' + version + '_' + date + '.pdf';
}

function getZipFilename(slug: string): string {
  const date = new Date().toISOString().split('T')[0];
  return 'linup_' + slug + '_' + date + '.zip';
}

async function assembleSpecData(projectId: string, stages: number[], db: SupabaseClient): Promise<any> {
  const { data: project } = await db.from('projects').select('name, slug, identity_json').eq('id', projectId).single();
  const { data: consolidations } = await db.from('stage_consolidations').select('stage, consolidation_json').eq('project_id', projectId).in('stage', stages).order('stage');
  const { data: pltOutputs } = await db.from('stage_runs').select('stage, plt_output_json').eq('project_id', projectId).in('stage', stages).order('stage');
  const { data: founderAnswers } = await db.from('founder_answers').select('stage, question_id, answer').eq('project_id', projectId).order('stage');
  const { data: rtmEntries } = await db.from('rtm_entries').select('req_id, stage, status, notes').eq('project_id', projectId).order('stage');
  return { project, consolidations: consolidations ?? [], pltOutputs: pltOutputs ?? [], founderAnswers: founderAnswers ?? [], rtmEntries: rtmEntries ?? [] };
}

function renderBulletList(
  ce: typeof React.createElement,
  ViewComp: any,
  TextComp: any,
  label: string,
  items: any[],
  styles: any
): any {
  if (!items || items.length === 0) return null;
  const bullets = items.map((item: any, i: number) =>
    ce(ViewComp, { key: i, style: styles.bulletRow },
      ce(TextComp, { style: styles.bulletDot }, '\u2022'),
      ce(TextComp, { style: styles.bulletText }, typeof item === 'string' ? item : JSON.stringify(item))
    )
  );
  return ce(ViewComp, { style: styles.section },
    ce(TextComp, { style: styles.sectionLabel }, label),
    ...bullets
  );
}

// generateSpecPdf - uses React.createElement (no JSX in .ts files)
// LINUP v2 branding: purple #8C00B4 cover, readable stage sections
export async function generateSpecPdf(projectId: string, stages: number[], db: SupabaseClient): Promise<Buffer> {
  const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');
  const data = await assembleSpecData(projectId, stages, db);
  const projectName = data.project?.name ?? 'Untitled Project';
  const projectSlug = data.project?.slug ?? projectId;
  const ce = React.createElement;

  const PURPLE = '#8C00B4';
  const WHITE  = '#FFFFFF';
  const LIGHT_PURPLE = '#F3E6F9';
  const DARK_TEXT = '#1A1A2E';
  const MID_TEXT  = '#4B5563';

  const styles = StyleSheet.create({
    coverPage:    { backgroundColor: PURPLE, height: '100%', padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
    coverEyebrow: { color: '#E0AAFF', fontSize: 11, letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase' },
    coverTitle:   { color: WHITE, fontSize: 36, fontFamily: 'Helvetica-Bold', marginBottom: 12, lineHeight: 1.2 },
    coverSubtitle:{ color: '#E0AAFF', fontSize: 14, marginBottom: 8 },
    coverDate:    { color: '#C084FC', fontSize: 10, marginTop: 32 },
    page:         { fontFamily: 'Helvetica', fontSize: 10, padding: 48, backgroundColor: WHITE },
    stageHeader:  { backgroundColor: PURPLE, padding: 12, marginBottom: 16, borderRadius: 4 },
    stageNumber:  { color: '#E0AAFF', fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 4 },
    stageTitle:   { color: WHITE, fontSize: 16, fontFamily: 'Helvetica-Bold' },
    section:      { marginBottom: 14 },
    sectionLabel: { color: PURPLE, fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    bulletRow:    { flexDirection: 'row', marginBottom: 4, paddingLeft: 4 },
    bulletDot:    { color: PURPLE, fontSize: 10, marginRight: 6, width: 10 },
    bulletText:   { color: DARK_TEXT, fontSize: 10, lineHeight: 1.5, flex: 1 },
    summaryText:  { color: MID_TEXT, fontSize: 10, lineHeight: 1.6, marginBottom: 10 },
    emptyText:    { color: '#9CA3AF', fontSize: 9, fontStyle: 'italic', marginBottom: 10 },
    divider:      { borderBottomWidth: 1, borderBottomColor: LIGHT_PURPLE, marginVertical: 10 },
    footer:       { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between' },
    footerText:   { color: '#9CA3AF', fontSize: 8 },
  });

  const coverPage = ce(Page as any, { size: 'A4', style: styles.coverPage },
    ce(View as any, null,
      ce(Text as any, { style: styles.coverEyebrow }, 'LINUP v2'),
      ce(Text as any, { style: styles.coverTitle }, projectName),
      ce(Text as any, { style: styles.coverSubtitle }, 'Engineering Specification'),
      ce(View as any, { style: styles.divider }),
      ce(Text as any, { style: styles.coverDate }, 'Generated ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
    )
  );

  const stagePages = (data.consolidations as any[]).map((c: any) => {
    const stageNum: number = c.stage;
    const stageName = STAGE_NAMES[stageNum] ?? ('Stage ' + stageNum);
    const cj = c.consolidation_json ?? {};

    const bindingConstraints: any[] = Array.isArray(cj.bindingConstraints) ? cj.bindingConstraints : [];
    const keyDecisions: any[]        = Array.isArray(cj.keyDecisions)        ? cj.keyDecisions        : [];
    const allAssumptions: any[]      = Array.isArray(cj.allAssumptions)      ? cj.allAssumptions      : [];
    const summary: string            = typeof cj.summary === 'string'        ? cj.summary             : '';
    const rationale: string          = typeof cj.rationale === 'string'      ? cj.rationale           : '';

    const constraintsSection  = renderBulletList(ce, View, Text, 'Binding Constraints',  bindingConstraints, styles);
    const decisionsSection    = renderBulletList(ce, View, Text, 'Key Decisions',        keyDecisions,       styles);
    const assumptionsSection  = renderBulletList(ce, View, Text, 'All Assumptions',      allAssumptions,     styles);

    const children: any[] = [
      ce(View as any, { style: styles.stageHeader },
        ce(Text as any, { style: styles.stageNumber }, 'STAGE ' + stageNum),
        ce(Text as any, { style: styles.stageTitle }, stageName)
      )
    ];

    if (summary) {
      children.push(
        ce(View as any, { style: styles.section },
          ce(Text as any, { style: styles.sectionLabel }, 'Summary'),
          ce(Text as any, { style: styles.summaryText }, summary)
        )
      );
    }

    if (rationale) {
      children.push(
        ce(View as any, { style: styles.section },
          ce(Text as any, { style: styles.sectionLabel }, 'Rationale'),
          ce(Text as any, { style: styles.summaryText }, rationale)
        )
      );
    }

    if (constraintsSection)  children.push(constraintsSection);
    if (decisionsSection)    children.push(decisionsSection);
    if (assumptionsSection)  children.push(assumptionsSection);

    if (!summary && !rationale && bindingConstraints.length === 0 && keyDecisions.length === 0 && allAssumptions.length === 0) {
      children.push(ce(Text as any, { style: styles.emptyText }, 'No structured content available for this stage.'));
    }

    children.push(
      ce(View as any, { style: styles.footer },
        ce(Text as any, { style: styles.footerText }, 'LINUP v2 \u2014 ' + projectName),
        ce(Text as any, { style: styles.footerText }, stageName)
      )
    );

    return ce(Page as any, { size: 'A4', style: styles.page }, ...children);
  });

  const doc = ce(Document as any, null, coverPage, ...stagePages);
  return renderToBuffer(doc as any);
}

async function generateRtmCsv(projectId: string, db: SupabaseClient): Promise<string> {
  const { data } = await db.from('rtm_entries').select('req_id, stage, status, notes').eq('project_id', projectId).order('stage');
  const rows = (data ?? []).map((r: any) => r.req_id + ',' + r.stage + ',' + r.status + ',' + (r.notes ?? '').replace(/,/g, ';'));
  return 'req_id,stage,status,notes\n' + rows.join('\n');
}

export async function generateAppPackageZip(projectId: string, db: SupabaseClient): Promise<Buffer> {
  const archiver = (await import('archiver')).default;
  const chunks: Buffer[] = [];
  const output = new Writable({ write(chunk: Buffer, _enc: string, cb: () => void) { chunks.push(chunk); cb(); } });
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);
  const allStages = [0,1,2,3,4,5,6,7,8,9,10,11,12];
  const specPdf = await generateSpecPdf(projectId, allStages, db);
  archive.append(specPdf, { name: 'specification/complete_specification.pdf' });
  const rtmCsv = await generateRtmCsv(projectId, db);
  archive.append(rtmCsv, { name: 'specification/requirements_traceability.csv' });
  const { data: project } = await db.from('projects').select('name, slug').eq('id', projectId).single();
  const readme = '# ' + (project?.name ?? projectId) + ' \u2014 LINUP App Package\n\nGenerated: ' + new Date().toISOString() + '\n\nSee specification/ for the full engineering specification.\n';
  archive.append(readme, { name: 'README.md' });
  await archive.finalize();
  await new Promise<void>((resolve, reject) => { output.on('finish', resolve); output.on('error', reject); archive.on('error', reject); });
  return Buffer.concat(chunks);
}

export async function uploadAndRecord(projectId: string, zipBuffer: Buffer, db: SupabaseClient): Promise<string> {
  const { data: project } = await db.from('projects').select('slug').eq('id', projectId).single();
  const slug = project?.slug ?? projectId;
  const filename = getZipFilename(slug);
  const storagePath = 'app-packages/' + projectId + '/' + filename;
  const storage = db.storage;
  await storage.from('app-packages').upload(storagePath, zipBuffer, { contentType: 'application/zip', upsert: true });
  const { data: signedData } = await storage.from('app-packages').createSignedUrl(storagePath, 86400);
  const signedUrl = signedData?.signedUrl ?? '';
  await db.from('download_events').insert({
    project_id: projectId, download_type: 'APP', storage_path: storagePath, download_url: signedUrl,
    download_url_expires_at: new Date(Date.now() + 86400_000).toISOString(),
    artifact_expires_at: new Date(Date.now() + 90 * 86400_000).toISOString(),
    created_at: new Date().toISOString(),
  });
  console.log('[zip-generator] ZIP uploaded: ' + storagePath);
  return signedUrl;
}