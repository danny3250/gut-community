import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type CommunityAuthor = {
  user_id?: string | null;
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
  verification_status: string | null;
};

export type CommunitySource = "community" | "legacy_forum";

export type CommunityPostRecord = {
  id: string;
  source: CommunitySource;
  title: string;
  body: string;
  topic: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
  author_user_id: string;
  profiles: CommunityAuthor | CommunityAuthor[] | null;
  reply_count?: number;
  vote_score?: number;
  upvote_count?: number;
  downvote_count?: number;
  user_vote?: number;
  is_saved?: boolean;
};

export type CommunityReplyRecord = {
  id: string;
  source: CommunitySource;
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
  vote_score?: number;
  upvote_count?: number;
  downvote_count?: number;
  user_vote?: number;
};

type CommunityPostRow = {
  id: string;
  title: string;
  body: string;
  topic: string | null;
  visibility: string | null;
  created_at: string;
  updated_at: string | null;
  author_user_id: string;
};

type LegacyForumPostRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  created_by: string;
};

type CommunityReplyRow = {
  id: string;
  post_id: string;
  author_user_id: string;
  body: string;
  is_provider_response: boolean | null;
  provider_id: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type LegacyForumCommentRow = {
  id: string;
  post_id: string;
  created_by: string;
  body: string;
  created_at: string;
};

type VoteRow = {
  vote_value: number;
};

type SavedThreadRow = {
  thread_id: string;
};

function getReadClient(supabase: SupabaseClient) {
  try {
    return createAdminClient();
  } catch {
    return supabase;
  }
}

function isMissingRelationError(error: { code?: string | null; message?: string | null } | null) {
  if (!error) return false;
  return error.code === "PGRST205" || error.code === "42P01";
}

async function fetchAuthorMap(supabase: SupabaseClient, authorIds: string[]) {
  if (authorIds.length === 0) {
    return new Map<string, CommunityAuthor>();
  }

  const { data, error } = await supabase.from("profiles").select("user_id,display_name,role").in("user_id", authorIds);
  if (error) throw error;

  return new Map(
    ((data ?? []) as CommunityAuthor[]).map((author) => [
      String(author.user_id),
      {
        user_id: author.user_id ?? null,
        display_name: author.display_name ?? null,
        role: author.role ?? null,
      },
    ])
  );
}

async function fetchProviderMapByUserId(supabase: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, CommunityProvider>();
  }

  const { data, error } = await supabase
    .from("providers")
    .select("id,user_id,slug,display_name,credentials,specialty,states_served,verification_status")
    .in("user_id", userIds)
    .eq("verification_status", "verified");

  if (error) throw error;

  return new Map(
    ((data ?? []) as (CommunityProvider & { user_id: string })[]).map((provider) => [
      provider.user_id,
      {
        id: provider.id,
        slug: provider.slug ?? null,
        display_name: provider.display_name,
        credentials: provider.credentials ?? null,
        specialty: provider.specialty ?? null,
        states_served: provider.states_served ?? null,
        verification_status: provider.verification_status ?? null,
      },
    ])
  );
}

function normalizeCommunityPosts(rows: CommunityPostRow[]) {
  return rows.map(
    (post): CommunityPostRecord => ({
      id: post.id,
      source: "community",
      title: post.title,
      body: post.body,
      topic: post.topic ?? null,
      visibility: post.visibility ?? "public",
      created_at: post.created_at,
      updated_at: post.updated_at ?? post.created_at,
      author_user_id: post.author_user_id,
      profiles: null,
    })
  );
}

function normalizeLegacyPosts(rows: LegacyForumPostRow[]) {
  return rows.map(
    (post): CommunityPostRecord => ({
      id: post.id,
      source: "legacy_forum",
      title: post.title,
      body: post.body,
      topic: "Community support",
      visibility: "public",
      created_at: post.created_at,
      updated_at: post.created_at,
      author_user_id: post.created_by,
      profiles: null,
    })
  );
}

function normalizeCommunityReplies(rows: CommunityReplyRow[]) {
  return rows.map(
    (reply): CommunityReplyRecord => ({
      id: reply.id,
      source: "community",
      post_id: reply.post_id,
      author_user_id: reply.author_user_id,
      body: reply.body,
      is_provider_response: Boolean(reply.is_provider_response),
      provider_id: reply.provider_id ?? null,
      verified_at: reply.verified_at ?? null,
      created_at: reply.created_at,
      updated_at: reply.updated_at ?? reply.created_at,
      profiles: null,
      providers: null,
    })
  );
}

function normalizeLegacyReplies(rows: LegacyForumCommentRow[], verifiedProviders: Map<string, CommunityProvider>) {
  return rows.map(
    (reply): CommunityReplyRecord => ({
      id: reply.id,
      source: "legacy_forum",
      post_id: reply.post_id,
      author_user_id: reply.created_by,
      body: reply.body,
      is_provider_response: verifiedProviders.has(reply.created_by),
      provider_id: verifiedProviders.get(reply.created_by)?.id ?? null,
      verified_at: verifiedProviders.has(reply.created_by) ? reply.created_at : null,
      created_at: reply.created_at,
      updated_at: reply.created_at,
      profiles: null,
      providers: verifiedProviders.get(reply.created_by) ?? null,
    })
  );
}

function buildVoteScoreMap(
  rows: Array<{ vote_value: number; key: string }>
) {
  const scoreMap = new Map<string, number>();
  for (const row of rows) {
    scoreMap.set(row.key, (scoreMap.get(row.key) ?? 0) + row.vote_value);
  }
  return scoreMap;
}

function buildVoteBreakdownMap(rows: Array<{ vote_value: number; key: string }>) {
  const voteMap = new Map<string, { upvotes: number; downvotes: number }>();

  for (const row of rows) {
    const current = voteMap.get(row.key) ?? { upvotes: 0, downvotes: 0 };
    if (row.vote_value > 0) {
      current.upvotes += 1;
    } else if (row.vote_value < 0) {
      current.downvotes += 1;
    }
    voteMap.set(row.key, current);
  }

  return voteMap;
}

export async function fetchCommunityPosts(supabase: SupabaseClient) {
  const readClient = getReadClient(supabase);

  const [{ data: communityData, error: communityError }, { data: legacyData, error: legacyError }] = await Promise.all([
    readClient
      .from("community_posts")
      .select("id,title,body,topic,visibility,created_at,updated_at,author_user_id")
      .order("updated_at", { ascending: false }),
    readClient.from("forum_posts").select("id,title,body,created_at,created_by").order("created_at", { ascending: false }),
  ]);

  if (communityError) throw communityError;
  if (legacyError) throw legacyError;

  const posts = [
    ...normalizeCommunityPosts((communityData ?? []) as CommunityPostRow[]),
    ...normalizeLegacyPosts((legacyData ?? []) as LegacyForumPostRow[]),
  ];

  const authorIds = Array.from(new Set(posts.map((post) => post.author_user_id).filter(Boolean)));
  const authorMap = await fetchAuthorMap(readClient, authorIds);

  const communityPostIds = posts.filter((post) => post.source === "community").map((post) => post.id);
  const legacyPostIds = posts.filter((post) => post.source === "legacy_forum").map((post) => post.id);

  const [{ data: communityReplies, error: communityRepliesError }, { data: legacyReplies, error: legacyRepliesError }] =
    await Promise.all([
      communityPostIds.length > 0
        ? readClient.from("community_replies").select("post_id").in("post_id", communityPostIds)
        : Promise.resolve({ data: [], error: null }),
      legacyPostIds.length > 0
        ? readClient.from("forum_comments").select("post_id").in("post_id", legacyPostIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (communityRepliesError) throw communityRepliesError;
  if (legacyRepliesError) throw legacyRepliesError;

  const replyCounts = new Map<string, number>();
  for (const row of (communityReplies ?? []) as { post_id: string }[]) {
    replyCounts.set(`community:${row.post_id}`, (replyCounts.get(`community:${row.post_id}`) ?? 0) + 1);
  }
  for (const row of (legacyReplies ?? []) as { post_id: string }[]) {
    replyCounts.set(`legacy_forum:${row.post_id}`, (replyCounts.get(`legacy_forum:${row.post_id}`) ?? 0) + 1);
  }

  return posts
    .map((post) => ({
      ...post,
      profiles: authorMap.get(post.author_user_id) ?? null,
      reply_count: replyCounts.get(`${post.source}:${post.id}`) ?? 0,
    }))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function fetchCommunityPostById(supabase: SupabaseClient, postId: string, userId?: string) {
  const readClient = getReadClient(supabase);

  const { data: communityData, error: communityError } = await readClient
    .from("community_posts")
    .select("id,title,body,topic,visibility,created_at,updated_at,author_user_id")
    .eq("id", postId)
    .maybeSingle();

  if (communityError) throw communityError;

  let post: CommunityPostRecord | null = null;

  if (communityData) {
    post = normalizeCommunityPosts([communityData as CommunityPostRow])[0] ?? null;
  } else {
    const { data: legacyData, error: legacyError } = await readClient
      .from("forum_posts")
      .select("id,title,body,created_at,created_by")
      .eq("id", postId)
      .maybeSingle();

    if (legacyError) throw legacyError;
    if (!legacyData) return null;
    post = normalizeLegacyPosts([legacyData as LegacyForumPostRow])[0] ?? null;
  }

  if (!post) return null;

  const authorMap = await fetchAuthorMap(readClient, [post.author_user_id]);
  const [{ data: voteRows, error: voteError }, { data: savedRows, error: savedError }] = await Promise.all([
    readClient.from("community_thread_votes").select("vote_value").eq("thread_source", post.source).eq("thread_id", post.id),
    userId
      ? readClient.from("community_saved_threads").select("thread_id").eq("thread_source", post.source).eq("thread_id", post.id).eq("user_id", userId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (voteError && !isMissingRelationError(voteError)) throw voteError;
  if (savedError && !isMissingRelationError(savedError)) throw savedError;

  let userVote = 0;
  const threadVotes = isMissingRelationError(voteError) ? [] : ((voteRows ?? []) as VoteRow[]);
  const upvoteCount = threadVotes.filter((row) => row.vote_value > 0).length;
  const downvoteCount = threadVotes.filter((row) => row.vote_value < 0).length;
  if (userId) {
    const { data: userVoteRow, error: userVoteError } = await readClient
      .from("community_thread_votes")
      .select("vote_value")
      .eq("thread_source", post.source)
      .eq("thread_id", post.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (userVoteError && !isMissingRelationError(userVoteError)) throw userVoteError;
    userVote = isMissingRelationError(userVoteError) ? 0 : (userVoteRow as VoteRow | null)?.vote_value ?? 0;
  }

  return {
    ...post,
    profiles: authorMap.get(post.author_user_id) ?? null,
    vote_score: threadVotes.reduce((sum, row) => sum + row.vote_value, 0),
    upvote_count: upvoteCount,
    downvote_count: downvoteCount,
    user_vote: userVote,
    is_saved: isMissingRelationError(savedError) ? false : ((savedRows ?? []) as SavedThreadRow[]).length > 0,
  };
}

export async function fetchCommunityReplies(
  supabase: SupabaseClient,
  postId: string,
  source: CommunitySource = "community",
  userId?: string
) {
  const readClient = getReadClient(supabase);

  if (source === "legacy_forum") {
    const { data, error } = await readClient
      .from("forum_comments")
      .select("id,post_id,created_by,body,created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as LegacyForumCommentRow[];
    const authorIds = Array.from(new Set(rows.map((reply) => reply.created_by).filter(Boolean)));
    const [authorMap, providerMap] = await Promise.all([
      fetchAuthorMap(readClient, authorIds),
      fetchProviderMapByUserId(readClient, authorIds),
    ]);

    const normalizedReplies = normalizeLegacyReplies(rows, providerMap);
    const replyIds = normalizedReplies.map((reply) => reply.id);
    const [{ data: voteRows, error: voteError }, { data: userVoteRows, error: userVoteError }] = await Promise.all([
      replyIds.length > 0
        ? readClient.from("community_reply_votes").select("reply_id,vote_value").eq("reply_source", source).in("reply_id", replyIds)
        : Promise.resolve({ data: [], error: null }),
      userId && replyIds.length > 0
        ? readClient.from("community_reply_votes").select("reply_id,vote_value").eq("reply_source", source).eq("user_id", userId).in("reply_id", replyIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (voteError && !isMissingRelationError(voteError)) throw voteError;
    if (userVoteError && !isMissingRelationError(userVoteError)) throw userVoteError;

    const voteRowsForReplies = isMissingRelationError(voteError) ? [] : ((voteRows ?? []) as Array<{ reply_id: string; vote_value: number }>);
    const scoreMap = buildVoteScoreMap(
      voteRowsForReplies.map((row) => ({
        key: row.reply_id,
        vote_value: row.vote_value,
      }))
    );
    const breakdownMap = buildVoteBreakdownMap(
      voteRowsForReplies.map((row) => ({
        key: row.reply_id,
        vote_value: row.vote_value,
      }))
    );
    const userVoteMap = new Map(
      (isMissingRelationError(userVoteError) ? [] : ((userVoteRows ?? []) as Array<{ reply_id: string; vote_value: number }>)).map((row) => [row.reply_id, row.vote_value])
    );

    return normalizedReplies.map((reply) => ({
      ...reply,
      profiles: authorMap.get(reply.author_user_id) ?? null,
      vote_score: scoreMap.get(reply.id) ?? 0,
      upvote_count: breakdownMap.get(reply.id)?.upvotes ?? 0,
      downvote_count: breakdownMap.get(reply.id)?.downvotes ?? 0,
      user_vote: userVoteMap.get(reply.id) ?? 0,
    }));
  }

  const { data, error } = await readClient
    .from("community_replies")
    .select("id,post_id,author_user_id,body,is_provider_response,provider_id,verified_at,created_at,updated_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = normalizeCommunityReplies((data ?? []) as CommunityReplyRow[]);
  const authorIds = Array.from(new Set(rows.map((reply) => reply.author_user_id).filter(Boolean)));
  const providerIds = Array.from(new Set(rows.map((reply) => reply.provider_id).filter(Boolean)));

  const [authorMap, providerData] = await Promise.all([
    fetchAuthorMap(readClient, authorIds),
    providerIds.length > 0
      ? readClient
          .from("providers")
          .select("id,slug,display_name,credentials,specialty,states_served,verification_status")
          .in("id", providerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (providerData.error) throw providerData.error;

  const providerMap = new Map(
    ((providerData.data ?? []) as CommunityProvider[]).map((provider) => [provider.id, provider])
  );

  const replyIds = rows.map((reply) => reply.id);
  const [{ data: voteRows, error: voteError }, { data: userVoteRows, error: userVoteError }] = await Promise.all([
    replyIds.length > 0
      ? readClient.from("community_reply_votes").select("reply_id,vote_value").eq("reply_source", source).in("reply_id", replyIds)
      : Promise.resolve({ data: [], error: null }),
    userId && replyIds.length > 0
      ? readClient.from("community_reply_votes").select("reply_id,vote_value").eq("reply_source", source).eq("user_id", userId).in("reply_id", replyIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (voteError && !isMissingRelationError(voteError)) throw voteError;
  if (userVoteError && !isMissingRelationError(userVoteError)) throw userVoteError;

  const voteRowsForReplies = isMissingRelationError(voteError) ? [] : ((voteRows ?? []) as Array<{ reply_id: string; vote_value: number }>);
  const scoreMap = buildVoteScoreMap(
    voteRowsForReplies.map((row) => ({
      key: row.reply_id,
      vote_value: row.vote_value,
    }))
  );
  const breakdownMap = buildVoteBreakdownMap(
    voteRowsForReplies.map((row) => ({
      key: row.reply_id,
      vote_value: row.vote_value,
    }))
  );
  const userVoteMap = new Map(
    (isMissingRelationError(userVoteError) ? [] : ((userVoteRows ?? []) as Array<{ reply_id: string; vote_value: number }>)).map((row) => [row.reply_id, row.vote_value])
  );

  return rows.map((reply) => ({
    ...reply,
    profiles: authorMap.get(reply.author_user_id) ?? null,
    providers: reply.provider_id ? (providerMap.get(reply.provider_id) ?? null) : null,
    vote_score: scoreMap.get(reply.id) ?? 0,
    upvote_count: breakdownMap.get(reply.id)?.upvotes ?? 0,
    downvote_count: breakdownMap.get(reply.id)?.downvotes ?? 0,
    user_vote: userVoteMap.get(reply.id) ?? 0,
  }));
}

export function isNewCommunityThread(post: Pick<CommunityPostRecord, "created_at">) {
  const createdAt = new Date(post.created_at).getTime();
  if (Number.isNaN(createdAt)) {
    return false;
  }

  return Date.now() - createdAt < 24 * 60 * 60 * 1000;
}

export function getCommunityPostBadge(post: Pick<CommunityPostRecord, "created_at" | "topic">) {
  if (isNewCommunityThread(post)) {
    return "New Thread";
  }

  if (!post.topic || post.topic === "Community support") {
    return null;
  }

  return post.topic;
}

export function getCommunityTopics(posts: Pick<CommunityPostRecord, "topic">[]) {
  return Array.from(
    new Set(posts.map((post) => post.topic).filter((topic): topic is string => Boolean(topic) && topic !== "Community support"))
  ).sort();
}
