-- Enable Row Level Security on all public tables.
-- The app reads/writes data via Prisma (direct Postgres), not Supabase PostgREST.
-- With RLS enabled and no permissive policies for anon/authenticated, the public
-- Data API cannot read or modify these tables.

ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShiftSupervisor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Defense in depth: revoke PostgREST role access (Prisma uses postgres role).
REVOKE ALL ON TABLE "Employee" FROM anon, authenticated;
REVOKE ALL ON TABLE "WorkSchedule" FROM anon, authenticated;
REVOKE ALL ON TABLE "Alert" FROM anon, authenticated;
REVOKE ALL ON TABLE "Department" FROM anon, authenticated;
REVOKE ALL ON TABLE "ShiftSupervisor" FROM anon, authenticated;
REVOKE ALL ON TABLE "Attendance" FROM anon, authenticated;
REVOKE ALL ON TABLE "SystemUser" FROM anon, authenticated;
REVOKE ALL ON TABLE "RateLimit" FROM anon, authenticated;
REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;
