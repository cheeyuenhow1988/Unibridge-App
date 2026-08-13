-- 0012 Application rejection status
-- The back office groups applications into Pending / Passed / Failed;
-- "failed" needs a real rejected status. The student app's demo tracker
-- does not read backend applications yet, so this is additive and safe.
alter table public.applications drop constraint applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('submitted', 'under_review', 'conditional_offer', 'offer',
                    'accepted', 'coe_issued', 'rejected'));
