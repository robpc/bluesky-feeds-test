export type FeedMetadata = {
  /**
   * A short name for the record that will show in urls.
   * Lowercase with no spaces.
   * Ex: "whats-hot"
   */
  id: string;
  /**
   * A display name for your feed
   * Ex: "What's Hot"
   */
  displayName: string;
  /**
   * (Optional) A description of your feed.
   * Ex: "Top trending content from the whole network"
   */
  description?: string;
  /**
   * (Optional) The path to an image to be used as your feed's avatar.
   * Ex: "~/path/to/avatar.jpeg"
   */
  avatar?: string;
};

export type FeedInitFn = () => any;
export type FeedFetchFn = (
  limit: number,
  cursor?: string
) => Promise<{ curor?: string; feed: { post: string }[] }>;

export type Feed = {
  metadata: FeedMetadata;
  init: FeedInitFn;
  feed: FeedFetchFn;
};
