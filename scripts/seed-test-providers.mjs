import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

loadEnvFile(path.join(workspaceRoot, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const organizationSeed = {
  name: "CareBridge Digestive Health Clinic",
  slug: "carebridge-digestive-health-clinic",
  description: "Development seed organization for provider directory and scheduling tests.",
  contact_email: "hello@carebridge-dev.local",
  contact_phone: "(555) 010-2048",
};

const providerSeeds = [
  {
    email: "sarah.patel+carebridge-dev@example.com",
    password: "CareBridgeDev!234",
    display_name: "Dr. Sarah Patel",
    credentials: "MD",
    specialty: "Gastroenterology",
    bio: "Board-certified gastroenterologist focused on digestive symptom evaluation, follow-up care, and telehealth support for patients managing chronic GI concerns.",
    states_served: ["NY", "NJ", "CT"],
    telehealth_enabled: true,
    areas_of_care: ["Digestive symptoms", "IBS support", "Telehealth follow-up"],
    visit_types: ["telehealth", "consultation", "follow_up"],
    weeklyAvailability: [
      { day_of_week: 1, start_local_time: "09:00", end_local_time: "12:00", timezone: "America/New_York", slot_duration_minutes: 30 },
      { day_of_week: 3, start_local_time: "13:00", end_local_time: "17:00", timezone: "America/New_York", slot_duration_minutes: 30 },
    ],
  },
  {
    email: "melissa.chen+carebridge-dev@example.com",
    password: "CareBridgeDev!234",
    display_name: "Melissa Chen",
    credentials: "MS, RDN",
    specialty: "Digestive Nutrition",
    bio: "Registered dietitian helping patients navigate food-related symptoms, meal planning, and practical telehealth nutrition support for chronic digestive conditions.",
    states_served: ["CA", "OR", "WA"],
    telehealth_enabled: true,
    areas_of_care: ["Food sensitivity support", "Nutrition counseling", "Meal planning"],
    visit_types: ["telehealth", "consultation", "follow_up"],
    weeklyAvailability: [
      { day_of_week: 2, start_local_time: "10:00", end_local_time: "14:00", timezone: "America/Los_Angeles", slot_duration_minutes: 30 },
      { day_of_week: 4, start_local_time: "09:00", end_local_time: "13:00", timezone: "America/Los_Angeles", slot_duration_minutes: 30 },
    ],
  },
];

async function main() {
  const organizationId = await ensureOrganization(organizationSeed);
  const userPool = await getReusableUsers();
  const results = [];

  for (const seed of providerSeeds) {
    const user = await ensureAuthUser(seed, userPool);
    await ensureProfile(user.id, seed.display_name, organizationId);
    const provider = await ensureProvider(user.id, organizationId, seed);
    await ensureAvailability(provider.id, seed.weeklyAvailability);
    results.push({
      name: seed.display_name,
      slug: slugify(seed.display_name),
      email: seed.email,
    });
  }

  console.log("Seeded CareBridge test providers:");
  for (const result of results) {
    console.log(`- ${result.name} -> /providers/${result.slug} (${result.email})`);
  }
}

async function ensureOrganization(seed) {
  const { data: existing, error: fetchError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", seed.slug)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("organizations")
    .insert(seed)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function ensureAuthUser(seed, reusableUsers) {
  const existing = await findUserByEmail(seed.email);
  if (existing) {
    return existing;
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: seed.email,
      password: seed.password,
      email_confirm: true,
      user_metadata: {
        full_name: seed.display_name,
      },
    });

    if (error) throw error;
    if (!data.user) {
      throw new Error(`Failed to create auth user for ${seed.email}`);
    }

    return data.user;
  } catch (error) {
    const fallback = reusableUsers.shift();
    if (!fallback) {
      throw error;
    }

    console.warn(`Falling back to existing auth user ${fallback.email ?? fallback.id} for ${seed.display_name}.`);
    return fallback;
  }
}

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureProfile(userId, displayName, organizationId) {
  const payload = {
    id: userId,
    user_id: userId,
    role: "provider",
    display_name: displayName,
    organization_id: organizationId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    console.warn(`Skipping profile upsert for ${displayName}: ${error.message}`);
  }
}

async function ensureProvider(userId, organizationId, seed) {
  const slug = slugify(seed.display_name);
  const payload = {
    user_id: userId,
    organization_id: organizationId,
    slug,
    display_name: seed.display_name,
    credentials: seed.credentials,
    specialty: seed.specialty,
    bio: seed.bio,
    states_served: seed.states_served,
    telehealth_enabled: seed.telehealth_enabled,
    areas_of_care: seed.areas_of_care,
    visit_types: seed.visit_types,
    updated_at: new Date().toISOString(),
  };

  const { data: existingBySlug, error: existingError } = await supabase
    .from("providers")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingBySlug?.id) {
    const { data, error } = await supabase
      .from("providers")
      .update(payload)
      .eq("id", existingBySlug.id)
      .select("id")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("providers")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

async function ensureAvailability(providerId, windows) {
  const { data: existing, error: fetchError } = await supabase
    .from("provider_availability_windows")
    .select("id,day_of_week,start_local_time,end_local_time,timezone,slot_duration_minutes")
    .eq("provider_id", providerId);

  if (fetchError) throw fetchError;

  for (const window of windows) {
    const match = (existing ?? []).find((row) =>
      row.day_of_week === window.day_of_week &&
      row.start_local_time === window.start_local_time &&
      row.end_local_time === window.end_local_time &&
      row.timezone === window.timezone &&
      row.slot_duration_minutes === window.slot_duration_minutes
    );

    if (match) continue;

    const { error } = await supabase.from("provider_availability_windows").insert({
      provider_id: providerId,
      day_of_week: window.day_of_week,
      weekday: window.day_of_week,
      start_local_time: window.start_local_time,
      end_local_time: window.end_local_time,
      timezone: window.timezone,
      slot_duration_minutes: window.slot_duration_minutes,
    });

    if (error) throw error;
  }
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function getReusableUsers() {
  const providerUserIds = new Set();
  const { data: providerRows, error: providerError } = await supabase.from("providers").select("user_id");
  if (providerError) throw providerError;

  for (const row of providerRows ?? []) {
    if (row.user_id) {
      providerUserIds.add(row.user_id);
    }
  }

  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const user of data.users) {
      if (!providerUserIds.has(user.id)) {
        users.push(user);
      }
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error("Failed to seed CareBridge test providers.");
  console.error(error);
  process.exit(1);
});
