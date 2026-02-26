import { DEFAULT_TIMEOUT } from "../constants.js";

// Twitter's public web client bearer token (same as used by the Twitter web app)
const BEARER_TOKEN =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

const USER_AGENT = "keytrace-runner/1.0";

const GRAPHQL_FEATURES = {
  creator_subscriptions_tweet_preview_api_enabled: true,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: false,
  responsive_web_grok_share_attachment_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

const GRAPHQL_FIELD_TOGGLES = {
  withArticleRichContentState: true,
  withArticlePlainText: false,
  withGrokAnalyze: false,
  withDisallowedReplyControls: false,
};

export interface TwitterFetchOptions {
  timeout?: number;
}

/**
 * Obtain a guest token from Twitter's activation endpoint.
 */
async function fetchGuestToken(timeout: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await globalThis.fetch("https://api.twitter.com/1.1/guest/activate.json", {
      method: "POST",
      headers: {
        authorization: `Bearer ${BEARER_TOKEN}`,
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Guest token request failed: HTTP ${response.status}`);
    }
    const data = (await response.json()) as { guest_token?: string };
    if (!data.guest_token) {
      throw new Error("No guest_token in Twitter activation response");
    }
    return data.guest_token;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch a tweet by ID using Twitter's public GraphQL API.
 * Returns the raw TweetResultByRestId GraphQL response.
 */
async function fetchTweet(tweetId: string, guestToken: string, timeout: number): Promise<unknown> {
  const url = new URL("https://api.x.com/graphql/d6YKjvQ920F-D4Y1PruO-A/TweetResultByRestId");
  url.searchParams.set("variables", JSON.stringify({ tweetId, withCommunity: false, includePromotedContent: false, withVoice: false }));
  url.searchParams.set("features", JSON.stringify(GRAPHQL_FEATURES));
  url.searchParams.set("fieldToggles", JSON.stringify(GRAPHQL_FIELD_TOGGLES));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await globalThis.fetch(url.toString(), {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        authorization: `Bearer ${BEARER_TOKEN}`,
        "content-type": "application/json",
        "x-guest-token": guestToken,
        "x-twitter-active-user": "yes",
        "x-twitter-client-language": "en",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Twitter GraphQL error: HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch a tweet given a twitter.com or x.com status URL.
 * Returns the raw GraphQL TweetResultByRestId payload so the runner can
 * extract fields via the provider's proof targets.
 */
export async function fetch(uri: string, options: TwitterFetchOptions = {}): Promise<unknown> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

  const match = uri.match(/\/status\/(\d+)/);
  if (!match) {
    throw new Error(`Cannot extract tweet ID from URI: ${uri}`);
  }
  const tweetId = match[1];

  const guestToken = await fetchGuestToken(timeout);
  return fetchTweet(tweetId, guestToken, timeout);
}
