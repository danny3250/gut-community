import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { Role } from "@/lib/auth/roles";

type TrendPoint = {
  label: string;
  value: number;
};

type DashboardMetrics = {
  totalUsers: number;
  totalProviders: number;
  pendingProviderApplications: number;
  appointmentsThisWeek: number;
  checkinsToday: number;
  userTrend: TrendPoint[];
  appointmentTrend: TrendPoint[];
  providerTrend: TrendPoint[];
};

type AdminUserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: Role | null;
  created_at: string | null;
  disabled: boolean;
  last_sign_in_at: string | null;
};

type AdminContentRow = {
  id: string;
  kind: "recipe" | "resource";
  title: string;
  status: string;
  created_at: string | null;
  href: string | null;
};

export async function fetchAdminDashboardMetrics(supabase: SupabaseClient): Promise<DashboardMetrics> {
  const [users, providers, appointments, checkins, pendingApplications] = await Promise.all([
    fetchAuthUsers(),
    fetchRowsWithDate(supabase, "providers", "created_at"),
    fetchRowsWithDate(supabase, "appointments", "start_time"),
    fetchRowsWithDate(supabase, "daily_checkins", "created_at"),
    fetchPendingProviderApplicationsCount(supabase),
  ]);

  const now = new Date();
  const weekStart = startOfDay(new Date(now));
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const todayStart = startOfDay(new Date(now));
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    totalUsers: users.length,
    totalProviders: providers.length,
    pendingProviderApplications: pendingApplications,
    appointmentsThisWeek: appointments.filter((row) => row.date >= weekStart && row.date < weekEnd).length,
    checkinsToday: checkins.filter((row) => row.date >= todayStart && row.date < tomorrow).length,
    userTrend: buildDailyTrend(users.map((user) => user.created_at).filter(Boolean) as string[], 7),
    appointmentTrend: buildDailyTrend(appointments.map((row) => row.raw), 7),
    providerTrend: buildDailyTrend(providers.map((row) => row.raw), 7),
  };
}

export async function fetchAdminUsers(limit = 50): Promise<AdminUserRow[]> {
  const [users, profiles] = await Promise.all([
    fetchAuthUsers(),
    fetchProfilesMap(),
  ]);

  return users
    .slice(0, limit)
    .map((user) => {
      const profile = profiles.get(user.id);
      return {
        id: user.id,
        email: user.email ?? null,
        display_name: profile?.display_name ?? user.user_metadata?.display_name ?? null,
        role: (profile?.role ?? "patient") as Role,
        created_at: user.created_at ?? null,
        disabled: Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now()),
        last_sign_in_at: user.last_sign_in_at ?? null,
      };
    })
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

export async function fetchAdminContentRows(supabase: SupabaseClient, limit = 50): Promise<AdminContentRow[]> {
  const [{ data: recipes }, { data: resources }] = await Promise.all([
    supabase
      .from("recipes")
      .select("id,title,name,status,slug,created_at,is_public")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("content_resources")
      .select("id,title,type,visibility,slug,created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const recipeRows = ((recipes ?? []) as Array<{ id: string; title: string | null; name: string | null; status: string | null; slug: string | null; created_at: string | null; is_public: boolean | null }>).map(
    (recipe) => ({
      id: recipe.id,
      kind: "recipe" as const,
      title: recipe.title ?? recipe.name ?? "Untitled recipe",
      status: recipe.status ?? (recipe.is_public ? "published" : "draft"),
      created_at: recipe.created_at,
      href: `/recipes/${recipe.slug ?? recipe.id}/edit`,
    })
  );

  const resourceRows = ((resources ?? []) as Array<{ id: string; title: string; type: string | null; visibility: string | null; slug: string | null; created_at: string | null }>).map(
    (resource) => ({
      id: resource.id,
      kind: "resource" as const,
      title: resource.title,
      status: resource.visibility ?? "draft",
      created_at: resource.created_at,
      href: resource.slug ? `/resources#${resource.slug}` : "/resources",
    })
  );

  return [...recipeRows, ...resourceRows]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, limit);
}

async function fetchPendingProviderApplicationsCount(supabase: SupabaseClient) {
  const { count, error } = await supabase
    .from("provider_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    if (error.code === "PGRST205" && (error.message ?? "").includes("public.provider_applications")) {
      return 0;
    }
    throw error;
  }

  return count ?? 0;
}

async function fetchRowsWithDate(supabase: SupabaseClient, table: string, column: string) {
  const { data, error } = await supabase.from(table).select(`${column}`).order(column, { ascending: true });
  if (error) throw error;

  return ((data ?? []) as unknown as Array<Record<string, string | null>>)
    .map((row) => row[column])
    .filter((value): value is string => Boolean(value))
    .map((raw) => ({ raw, date: new Date(raw) }));
}

async function fetchAuthUsers() {
  try {
    const admin = createAdminClient();
    const response = await (admin.auth.admin as any).listUsers({ page: 1, perPage: 200 });
    return ((response?.data?.users ?? []) as any[]).map((user) => ({
      id: user.id as string,
      email: (user.email ?? null) as string | null,
      created_at: (user.created_at ?? null) as string | null,
      banned_until: (user.banned_until ?? null) as string | null,
      last_sign_in_at: (user.last_sign_in_at ?? null) as string | null,
      user_metadata: (user.user_metadata ?? {}) as Record<string, string | undefined>,
    }));
  } catch {
    return [];
  }
}

async function fetchProfilesMap() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id,display_name,role");

    return new Map(
      (((data ?? []) as Array<{ id: string; display_name: string | null; role: Role | null }>).map((profile) => [
        profile.id,
        profile,
      ])) as [string, { id: string; display_name: string | null; role: Role | null }][]
    );
  } catch {
    return new Map<string, { id: string; display_name: string | null; role: Role | null }>();
  }
}

function buildDailyTrend(isoDates: string[], days: number) {
  const today = startOfDay(new Date());
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return {
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      key: date.toISOString().slice(0, 10),
      value: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const isoDate of isoDates) {
    const key = new Date(isoDate).toISOString().slice(0, 10);
    const bucket = bucketMap.get(key);
    if (bucket) bucket.value += 1;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}
