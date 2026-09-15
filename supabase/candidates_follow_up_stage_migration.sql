-- Allow the new "Follow Up" pipeline stage (added to the STAGES list in RecruitmentBoard.tsx)
-- through the existing candidates.stage check constraint.
alter table candidates drop constraint candidates_stage_check;
alter table candidates add constraint candidates_stage_check
  check (stage = ANY (ARRAY['new'::text, 'contacted'::text, 'follow_up'::text, 'interview_1'::text, 'interview_2'::text, 'offer'::text, 'hired'::text, 'rejected'::text]));
