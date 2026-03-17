import type { SupabaseClient } from "@supabase/supabase-js";

export type CommunityAuthor = {
  display_name: string | null;
  role: string | null;
};

export type CommunityProvider = {
  id: string;
  slug: string | null;
  display_name: string;
  credentials: string | null;
  specialty: string | null;
  states_served: string[] | null;
};

export type CommunityPostRecord = {
  id: string;
  title: string;
  body: string;
  topic: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
  author_user_id: string;
  profiles: CommunityAuthor | CommunityAuthor[] | null;
  reply_count?: number;
};

export type CommunityReplyRecord = {
  id: string;
  post_id: string;
  author_user_id: string;
  body: string;
  is_provider_response: boolean;
  provider_id: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: CommunityAuthor | CommunityAuthor[] | null;
  providers: CommunityProvider | CommunityProvider[] | null;
};

export async function fetchCommunityPosts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("community_posts")
    .select("id,title,body,topic,visibility,created_at,updated_at,author_user_id,profiles!community_posts_author_user_id_fkey(display_name,role)")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const posts = ((data ?? []) as CommunityPostRecord[]).map((post) => ({
    ...post,
    profiles: Array.isArray(post.profiles) ? (post.profiles[0] ?? null) : (post.profiles ?? null),
  }));

  const postIds = posts.map((post) => post.id);
  if (postIds.length === 0) return posts.map((post) => ({ ...post, reply_count: 0 }));

  const { data: replies } = await supabase
    .from("community_replies")
    .select("post_id")
    .in("post_id", postIds);

  const replyCounts = new Map<string, number>();
  for (const row of (replies ?? []) as { post_id: string }[]) {
    replyCounts.set(row.post_id, (replyCounts.get(row.post_id) ?? 0) + 1);
  }

  return posts.map((post) => ({ ...post, reply_count: replyCounts.get(post.id) ?? 0 }));
}

export async function fetchCommunityPostById(supabase: SupabaseClient, postId: string) {
  const { data, error } = await supabase
    .from("community_posts")
    .select("id,title,body,topic,visibility,created_at,updated_at,author_user_id,profiles!community_posts_author_user_id_fkey(display_name,role)")
    .eq("id", postId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const post = data as CommunityPostRecord;
  return {
    ...post,
    profiles: Array.isArray(post.profiles) ? (post.profiles[0] ?? null) : (post.profiles ?? null),
  };
}

export async function fetchCommunityReplies(supabase: SupabaseClient, postId: string) {
  const { data, error } = await supabase
    .from("community_replies")
    .select(
      "id,post_id,author_user_id,body,is_provider_response,provider_id,verified_at,created_at,updated_at,profiles!community_replies_author_user_id_fkey(display_name,role),providers(id,slug,display_name,credentials,specialty,states_served)"
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as CommunityReplyRecord[]).map((reply) => ({
    ...reply,
    profiles: Array.isArray(reply.profiles) ? (reply.profiles[0] ?? null) : (reply.profiles ?? null),
    providers: Array.isArray(reply.providers) ? (reply.providers[0] ?? null) : (reply.providers ?? null),
  }));
}

export function getCommunityTopics(posts: Pick<CommunityPostRecord, "topic">[]) {
  return Array.from(new Set(posts.map((post) => post.topic).filter(Boolean))).sort();
}
