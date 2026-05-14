import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { handleFounderAnswer } from '../pipeline/pm.js';
export async function founderRoutes(fastify) {
    // POST /api/founder/answer
    // Stores a founder answer to a pipeline question.
    // Doc 11 D6: idempotent — second submission of same question_id rejected.
    // Doc 11 D6: first write wins; concurrent submissions safe.
    fastify.post('/api/founder/answer', { preHandler: requireAuth }, async (request, reply) => {
        const { projectId, stage, questionId, answer } = request.body;
        if (!projectId || stage === undefined || !questionId || !answer) {
            return reply.status(400).send({ error: 'projectId, stage, questionId and answer are required.' });
        }
        // Verify caller is a member of this project
        const userId = request.profile.id;
        const { data: membership } = await supabase
            .from('organisation_members')
            .select('user_id')
            .eq('user_id', userId)
            .eq('organisation_id', supabase.from('projects').select('organisation_id').eq('id', projectId).single())
            .maybeSingle();
        // Simpler membership check via projects join
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, organisation_id')
            .eq('id', projectId)
            .single();
        if (projectError || !project) {
            return reply.status(404).send({ error: 'Project not found.' });
        }
        const { data: member } = await supabase
            .from('organisation_members')
            .select('user_id')
            .eq('organisation_id', project.organisation_id)
            .eq('user_id', userId)
            .maybeSingle();
        if (!member) {
            return reply.status(403).send({ error: 'FORBIDDEN' });
        }
        // Doc 11 D6: idempotency check — reject if already answered
        const { data: existing } = await supabase
            .from('founder_answers')
            .select('id')
            .eq('project_id', projectId)
            .eq('stage', stage)
            .eq('question_id', questionId)
            .maybeSingle();
        if (existing) {
            return reply.status(409).send({
                error: 'ALREADY_ANSWERED',
                message: 'This question has already been answered.',
                locked: true,
                alreadyAnswered: true,
            });
        }
        // Get current stage consolidation for compression (needed by handleFounderAnswer)
        const { data: stageRun } = await supabase
            .from('stage_runs')
            .select('status')
            .eq('project_id', projectId)
            .eq('stage', stage)
            .single();
        if (!stageRun || stageRun.status !== 'AWAITING_FOUNDER') {
            return reply.status(409).send({ error: 'Stage is not awaiting founder input.' });
        }
        // Retrieve consolidation from payload_archive for compression
        const { data: archive } = await supabase
            .from('payload_archive')
            .select('consolidation_json')
            .eq('project_id', projectId)
            .eq('stage', stage)
            .maybeSingle();
        const consolidation = archive?.consolidation_json ?? {};
        const result = await handleFounderAnswer(projectId, stage, questionId, answer, consolidation, supabase);
        return reply.status(200).send(result);
    });
}
//# sourceMappingURL=founder.js.map