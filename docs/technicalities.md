> [!NOTE]
> This document will be much less formal than the [README](../README.md).

## [Ratelimits](#ratelimits)

favedecks utilizes *some* of Twitter's internal APIs (`webpack.common.redux.api`) in order to bring QoL features like the "Sort Bookmarks" modal and the ability to (un)bookmark tweets besides *just* from the tweet component. Twitter's API has ratelimits, which means:

- You can't (un)bookmark more than 500 tweets in 15 minutes.
- You can (theoretically) fetch **at most** 50000 tweets from your Bookmarks timeline in 15 minutes.

While this seems reasonable from an end-user perspective, the (un)bookmark endpoint and the inability to "bulk bookmark" tweets narrows the amount of features favedeck can encompass.

## [`twitter-react-hijacker`](#twitter-react-hijacker)

The way React is handled in this extension is probably one of the weirdest things ever and I haven't seen this being applied in any other projects (yet).

Twitter is rendered with React <sup>(shockers)</sup>. favedeck is also rendered with React. However, during development favedeck used its own instance of React (v19) to render popups and other components.

The issue with that is Twitter's components rely on `Context`s. A lot of `Context`s. Another silly thing is that you cannot pass `Context`s (or components at all, for that matter) between React instances. This left me in an awkward situation where to render a tweet outside the timeline I had to:

- Create a container using favedeck's React instance,
- Copy all the contexts and the `Tweet` component from Twitter's React instance (v18),
- Render the `Tweet` inside `createRoot(favedeckContainer)`.

This was very much a disaster and led to a lot of bad glue code being written. Eventually, I wanted to try a rather dumb idea, which turned out to work surprisingly well:

> ***What if favedeck's React imports get redirected to use Twitter's React instance?***

This is what the `twitter-react-hijacker` Vite plugin inside `wxt.config.ts` does. It detects any imports of React inside the extension and proxies them through `webpack.common.react.React`, `webpack.common.react.ReactDOM` and `webpack.common.react.JSXRuntime`, which are loaded from Twitters's webpack bundle.

> [!NOTE]
> The important thing to mention here is that **the popup code is exempt from this hijacking**. It renders React just like it would regularly, which is the reason why `Twitter is being rendered with React vXX.X.X` is displayed in the popup under "Debug Information".