const {
  parseCsvIntArray,
  parseJsonMaybe,
  requestSocialEcho,
  toNonEmptyString,
  validateSelectedMusic
} = require("./utils/socialecho");

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const outputFields = [
  { key: "code", label: "Code" },
  { key: "message", label: "Message" },
  { key: "data", label: "Data" }
];

const sampleTeam = {
  code: 0,
  message: "success",
  data: {
    id: 1024,
    title: "Example team"
  }
};

const sampleListPayload = {
  code: 0,
  message: "success",
  data: [
    {
      id: 1
    }
  ]
};

const sampleUploadUrl = {
  code: 0,
  message: "success",
  data: {
    url: "https://example.com/upload/path"
  }
};

const samplePublish = {
  code: 0,
  message: "success",
  data: {
    id: 10001,
    status: 1
  }
};

const performGetTeam = async (z, bundle) => {
  return requestSocialEcho(z, bundle, {
    method: "GET",
    path: "/v1/team",
    body: {}
  });
};

const performListAccounts = async (z, bundle) => {
  return requestSocialEcho(z, bundle, {
    method: "GET",
    path: "/v1/account",
    body: {
      page: toOptionalNumber(bundle.inputData.page),
      type: toOptionalNumber(bundle.inputData.type)
    }
  });
};

const performGetOauthLinks = async (z, bundle) => requestSocialEcho(z, bundle, {
  method: "GET",
  path: "/v1/oauth/links",
  body: {}
});

const performListArticles = async (z, bundle) => {
  return requestSocialEcho(z, bundle, {
    method: "GET",
    path: "/v1/article",
    body: {
      page: toOptionalNumber(bundle.inputData.page),
      account_ids: parseCsvIntArray(bundle.inputData.account_ids_csv)
    }
  });
};

const performGetReport = async (z, bundle) => {
  return requestSocialEcho(z, bundle, {
    method: "GET",
    path: "/v1/report",
    body: {
      start_date: bundle.inputData.start_date,
      end_date: bundle.inputData.end_date,
      time_type: toOptionalNumber(bundle.inputData.time_type),
      account_ids: parseCsvIntArray(bundle.inputData.account_ids_csv),
      group: toNonEmptyString(bundle.inputData.group)
    }
  });
};

const performGetUploadUrl = async (z, bundle) => {
  return requestSocialEcho(z, bundle, {
    method: "GET",
    path: "/v1/upload/url",
    body: {
      name: toNonEmptyString(bundle.inputData.name),
      content_type: toNonEmptyString(bundle.inputData.content_type)
    }
  });
};

const performListRedditCommunities = async (z, bundle) => {
  return requestSocialEcho(z, bundle, {
    method: "GET",
    path: "/v1/reddit/communities",
    body: {
      account_id: toOptionalNumber(bundle.inputData.account_id),
      page: toOptionalNumber(bundle.inputData.page),
      search: toNonEmptyString(bundle.inputData.search)
    }
  });
};

const performListPinterestBoards = async (z, bundle) => {
  return requestSocialEcho(z, bundle, {
    method: "GET",
    path: "/v1/pinterest/boards",
    body: {
      account_id: toOptionalNumber(bundle.inputData.account_id),
      page: toOptionalNumber(bundle.inputData.page),
      search: toNonEmptyString(bundle.inputData.search)
    }
  });
};

const performPublishArticle = async (z, bundle) => {
  const comment = parseJsonMaybe(bundle.inputData.comment_json, "comment_json");
  const extra = parseJsonMaybe(bundle.inputData.extra_json, "extra_json");
  const attachments = parseJsonMaybe(
    bundle.inputData.attachments_json,
    "attachments_json"
  );
  validateSelectedMusic(extra || {});

  return requestSocialEcho(z, bundle, {
    method: "POST",
    path: "/v1/publish/article",
    body: {
      account_id: toOptionalNumber(bundle.inputData.account_id),
      type: bundle.inputData.type,
      status: toOptionalNumber(bundle.inputData.status),
      scheduled_at: toNonEmptyString(bundle.inputData.scheduled_at),
      comment: comment || [],
      content: toNonEmptyString(bundle.inputData.content),
      extra: extra || {},
      attachments: attachments || []
    }
  });
};

const performListTiktokshopProducts = async (z, bundle) => requestSocialEcho(z, bundle, {
  method: "GET",
  path: "/v1/tiktokshop/products",
  body: {
    account_id: toOptionalNumber(bundle.inputData.account_id),
    page: toOptionalNumber(bundle.inputData.page),
    per_page: toOptionalNumber(bundle.inputData.per_page),
    keyword: toNonEmptyString(bundle.inputData.keyword)
  }
});

const performSyncTiktokshopProducts = async (z, bundle) => requestSocialEcho(z, bundle, {
  method: "POST",
  path: "/v1/tiktokshop/products/sync",
  body: { account_id: toOptionalNumber(bundle.inputData.account_id) }
});

const performListTiktokshopMusicGenres = async (z, bundle) => requestSocialEcho(z, bundle, {
  method: "GET",
  path: "/v1/tiktokshop/music/genres",
  body: {}
});

const performListTiktokshopTrendingMusic = async (z, bundle) => requestSocialEcho(z, bundle, {
  method: "GET",
  path: "/v1/tiktokshop/music/trending",
  body: {
    account_id: toOptionalNumber(bundle.inputData.account_id),
    country_code: toNonEmptyString(bundle.inputData.country_code),
    genre: toNonEmptyString(bundle.inputData.genre),
    date_range: toNonEmptyString(bundle.inputData.date_range)
  }
});

module.exports = {
  get_team: {
    key: "get_team",
    noun: "Team",
    display: {
      label: "Get Team",
      description: "Returns current team information."
    },
    operation: {
      inputFields: [],
      outputFields,
      sample: sampleTeam,
      perform: performGetTeam
    }
  },
  list_accounts: {
    key: "list_accounts",
    noun: "Account",
    display: {
      label: "List Accounts",
      description: "Returns social media accounts connected to the team (paginated)."
    },
    operation: {
      inputFields: [
        { key: "page", label: "Page", type: "integer", required: false },
        {
          key: "type",
          label: "Type",
          type: "integer",
          required: false,
          helpText: "1 = authorized accounts, 2 = competitor accounts"
        }
      ],
      outputFields,
      sample: sampleListPayload,
      perform: performListAccounts
    }
  },
  get_oauth_links: {
    key: "get_oauth_links",
    noun: "OAuth Link",
    display: { label: "Get OAuth Links", description: "Returns platform authorization links for the team." },
    operation: { inputFields: [], outputFields, sample: sampleListPayload, perform: performGetOauthLinks }
  },
  list_articles: {
    key: "list_articles",
    noun: "Article",
    display: {
      label: "List Articles",
      description: "Returns articles for the given account filters."
    },
    operation: {
      inputFields: [
        { key: "page", label: "Page", type: "integer", required: false },
        {
          key: "account_ids_csv",
          label: "Account IDs (CSV)",
          type: "string",
          required: false,
          helpText: "Example: 1001,1002,1003"
        }
      ],
      outputFields,
      sample: sampleListPayload,
      perform: performListArticles
    }
  },
  get_report: {
    key: "get_report",
    noun: "Report",
    display: {
      label: "Get Report",
      description: "Returns an analytics report for a date range and account filters."
    },
    operation: {
      inputFields: [
        {
          key: "start_date",
          label: "Start Date",
          type: "string",
          required: true
        },
        {
          key: "end_date",
          label: "End Date",
          type: "string",
          required: true
        },
        {
          key: "time_type",
          label: "Time Type",
          type: "integer",
          required: true,
          helpText: "1 = posts added in date range, 2 = all historical posts"
        },
        {
          key: "account_ids_csv",
          label: "Account IDs (CSV)",
          type: "string",
          required: false
        },
        {
          key: "group",
          label: "Group",
          type: "string",
          required: false,
          helpText: "Optional values: day, app, account"
        }
      ],
      outputFields,
      sample: sampleListPayload,
      perform: performGetReport
    }
  },
  get_upload_url: {
    key: "get_upload_url",
    noun: "Upload URL",
    display: {
      label: "Get Upload URL",
      description: "Returns a time-limited URL used to upload media for publishing."
    },
    operation: {
      inputFields: [
        {
          key: "name",
          label: "File Name",
          type: "string",
          required: false
        },
        {
          key: "content_type",
          label: "Content Type",
          type: "string",
          required: false,
          helpText: "MIME type, for example image/jpeg or video/mp4"
        }
      ],
      outputFields,
      sample: sampleUploadUrl,
      perform: performGetUploadUrl
    }
  },
  list_reddit_communities: {
    key: "list_reddit_communities",
    noun: "Reddit Community",
    display: {
      label: "List Reddit Communities",
      description: "Returns subreddit community options for the given account."
    },
    operation: {
      inputFields: [
        {
          key: "account_id",
          label: "Account ID",
          type: "integer",
          required: true
        },
        { key: "page", label: "Page", type: "integer", required: false },
        { key: "search", label: "Search", type: "string", required: false }
      ],
      outputFields,
      sample: sampleListPayload,
      perform: performListRedditCommunities
    }
  },
  list_pinterest_boards: {
    key: "list_pinterest_boards",
    noun: "Pinterest Board",
    display: {
      label: "List Pinterest Boards",
      description: "Returns pin boards for the given account."
    },
    operation: {
      inputFields: [
        {
          key: "account_id",
          label: "Account ID",
          type: "integer",
          required: true
        },
        { key: "page", label: "Page", type: "integer", required: false },
        { key: "search", label: "Search", type: "string", required: false }
      ],
      outputFields,
      sample: sampleListPayload,
      perform: performListPinterestBoards
    }
  },
  publish_article: {
    key: "publish_article",
    noun: "Article",
    display: {
      label: "Publish Article",
      description: "Creates or updates a post scheduled for a linked social account."
    },
    operation: {
      inputFields: [
        {
          key: "account_id",
          label: "Account ID",
          type: "integer",
          required: true
        },
        {
          key: "type",
          label: "Type",
          type: "string",
          required: true,
          helpText:
            "Example values: post, reels, stories, video, shorts, text, link, media"
        },
        {
          key: "status",
          label: "Status",
          type: "integer",
          required: true,
          helpText: "0 = draft, 1 = publish"
        },
        {
          key: "scheduled_at",
          label: "Scheduled At",
          type: "string",
          required: false
        },
        {
          key: "comment_json",
          label: "Comment JSON",
          type: "string",
          required: true,
          default: "[]",
          helpText: "JSON array string, for example [] or [\"comment text\"]"
        },
        {
          key: "content",
          label: "Content",
          type: "text",
          required: false
        },
        {
          key: "extra_json",
          label: "Extra JSON",
          type: "string",
          required: true,
          default: "{}",
          helpText: "JSON object string. Platform-specific fields go here."
        },
        {
          key: "attachments_json",
          label: "Attachments JSON",
          type: "string",
          required: true,
          default: "[]",
          helpText:
            "JSON array string. Example: an array containing an object with key 'url'."
        }
      ],
      outputFields,
      sample: samplePublish,
      perform: performPublishArticle
    }
  },
  list_tiktokshop_products: {
    key: "list_tiktokshop_products",
    noun: "TikTok Shop Product",
    display: { label: "List TikTok Shop Products", description: "Returns products available for publishing." },
    operation: {
      inputFields: [
        { key: "account_id", label: "Account ID", type: "integer", required: true },
        { key: "page", label: "Page", type: "integer", required: false },
        { key: "per_page", label: "Per Page", type: "integer", required: false },
        { key: "keyword", label: "Keyword", type: "string", required: false }
      ],
      outputFields, sample: sampleListPayload, perform: performListTiktokshopProducts
    }
  },
  sync_tiktokshop_products: {
    key: "sync_tiktokshop_products",
    noun: "TikTok Shop Product Sync",
    display: { label: "Sync TikTok Shop Products", description: "Submits a product synchronization task." },
    operation: {
      inputFields: [{ key: "account_id", label: "Account ID", type: "integer", required: true }],
      outputFields, sample: sampleListPayload, perform: performSyncTiktokshopProducts
    }
  },
  list_tiktokshop_music_genres: {
    key: "list_tiktokshop_music_genres",
    noun: "TikTok Shop Music Genre",
    display: { label: "List TikTok Shop Music Genres", description: "Returns current commercial music genres." },
    operation: { inputFields: [], outputFields, sample: sampleListPayload, perform: performListTiktokshopMusicGenres }
  },
  list_tiktokshop_trending_music: {
    key: "list_tiktokshop_trending_music",
    noun: "TikTok Shop Trending Music",
    display: { label: "List TikTok Shop Trending Music", description: "Returns current commercial trending music." },
    operation: {
      inputFields: [
        { key: "account_id", label: "Account ID", type: "integer", required: true },
        { key: "country_code", label: "Country Code", type: "string", required: false },
        { key: "genre", label: "Genre", type: "string", required: false },
        { key: "date_range", label: "Date Range", type: "string", required: false, default: "7DAY" }
      ],
      outputFields, sample: sampleListPayload, perform: performListTiktokshopTrendingMusic
    }
  }
};
