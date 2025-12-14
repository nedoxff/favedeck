// a lot of this information isn't actually needed, but it's nice to have around
export type RawTweet = {
	bookmark_count: number;
	bookmarked: boolean;
	conversation_id_str: string;
	created_at: string;
	display_text_range: [number, number];
	entities: RawTweetEntities;
	favorite_count: number;
	favorited: boolean;
	full_text: string;
	is_quote_status: boolean;
	lang: string;
	possibly_sensitive: boolean;
	possibly_sensitive_editable: boolean;
	quote_count: number;
	reply_count: number;
	retweet_count: number;
	retweeted: boolean;
	id_str: string;
	edit_control: {
		edit_tweet_ids: string[];
		editable_until_msecs: string;
		is_edit_eligible: boolean;
		edits_remaining: string;
	};
	is_translatable: boolean;
	has_super_follower: boolean;
	source: string;
	grok_analysis_button?: boolean;
	text: string;
	user: string;
	views: {
		count?: number;
		state: string;
	};
	source_name?: string;
	source_url?: string;
	permalink?: string;
};

export type RawTweetUser = {
	can_dm: boolean;
	can_media_tag: boolean;
	created_at: string;
	default_profile: boolean;
	default_profile_image: boolean;
	description: string;
	entities: {
		description: RawTweetEntities;
	};
	fast_followers_count: number;
	favourites_count: number;
	followers_count: number;
	friends_count: number;
	has_custom_timelines: boolean;
	is_translator: boolean;
	listed_count: number;
	media_count: number;
	normal_followers_count: number;
	pinned_tweet_ids_str: string[];
	possibly_sensitive: boolean;
	profile_banner_url?: string;
	profile_interstitial_type: string;
	statuses_count: number;
	translator_type: string;
	want_retweets: boolean;
	withheld_in_countries: string[];
	name: string;
	screen_name: string;
	id_str: string;
	profile_image_shape: string;
	location: string;
	profile_description_language: string;
	is_blue_verified: boolean;
	tipjar_settings: Record<string, unknown>;
	verified: boolean;
	protected: boolean;
	profile_image_url_https: string;
	follow_request_sent: boolean;
	following: boolean;
	has_graduated_access: boolean;
	parody_commentary_fan_label: string;
};

export type RawTweetEntities = {
	media?: RawTweetMedia[];
	symbols: {
		indices: number[];
		text: string;
	}[];
	hashtags: {
		indices: number[];
		text: string;
	}[];
	user_mentions: {
		id_str: string;
		name: string;
		screen_name: string;
		indices: number[];
	}[];
	urls: {
		display_url: string;
		expanded_url: string;
		indices: number[];
		url: string;
	}[];
};

export type RawTweetMedia = {
	allow_download_status?: {
		allow_download: boolean;
	};
	display_url: string;
	expanded_url: string;
	ext_media_availability?: {
		status: string;
	};
	sizes: Record<
		string,
		{
			h: number;
			w: number;
			resize?: string;
		}
	>;
	// are features required?
	id_str: string;
	indices: number[];
	media_key: string;
	media_results?: {
		result: {
			media_key: string;
		};
	};
	media_url_https: string;
	original_info: {
		// focus rects?
		height: number;
		width: number;
	};
	type: string;
	url: string;
	additional_media_info?: {
		monetizable?: boolean;
		source_user?: {
			user_results: {
				result: RawTweetUser;
			};
		};
	};
	video_info?: {
		aspect_ratio: number[];
		duration_millis: number;
		variants: {
			bitrate?: number;
			content_type: string;
			url: string;
		}[];
	};
};
