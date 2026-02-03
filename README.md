<h1 align="center">
    <img src="docs/img/logo-marten.png" width="200" height="200"/>
    <br/>
    favedeck
</h1>

**favedeck** <sup>(stylized in lowercase)</sup> is a browser extension that adds "decking" functionality similar to Pinterest's boards for Twitter bookmarks.

> [!WARNING]
> favedeck is very much in its infancy and hasn't been "battle-tested" so to say. I'd appreciate any sort of feedback and/or contributions!

## Contents

- [Features](#features)
- [Motivation/Implementation](#motivationimplementation)
- [Limitations](#limitations)
- [TODO](#todo)
- [Issues/Contributing](#issuescontributing)

## [Features](#features)

<img align="right" width="55%" src="docs/img/save.gif"/>

### Deck tweets

Upon pressing the bookmark button, you'll now be prompted to add the tweet to one or more decks.

> [!NOTE]
> This isn't a requirement; tweets are still bookmarked when you press the button, though you _will_ save time by doing the sorting beforehand.

<br clear="right"/><br/>

<img align="left" width="55%" src="docs/img/organize.gif"/>

### Organize

The "Bookmarks" page is now the "Decks" page. Here you can view, reorder, and explore the decks you've created.

You can also view all bookmarks as you normally would by pressing the "All bookmarks" button, or create new ones by pressing "New deck".

Tweets inside decks can also be reordered, "undecked" (removed from said deck), or added/moved to other decks.

> [!IMPORTANT]
> There are some limitations on how tweets can be re-ordered. [You can read about them here.](docs/faq.md#masonry-reordering)

<br clear="left"/><br/>

<h3 align="center">Sort existing bookmarks</h3>
<p align="center">Organize tweets from your bookmarks with a silly interactive interface similar to card games!</p>

<img align="center" src="docs/img/sort.gif"/>

<br/>
<p align="center"><i>and more stuff I probably forgot to include...</i></p>

## [Motivation/Implementation](#motivation-implementation)

My primary use of Twitter is to find art inspiration. Over the last 2 years I have accumulated about 6000 bookmarks and it became too cumbersome to search for a specific tweet or author.

Previously, [I made a different extension for downloading bookmarks](https://github.com/nedoxff/booksave), but that still leaves one with a folder of 6000 images with no categorization whatsoever, so favedeck felt like the next logical step.

While there are other extensions with similar functionality to favedeck, their core feature is either a) aggregating bookmarks from different social medias or b) syncing bookmarks between devices/accounts.

In contrast, favedeck hacks directly into the Twitter website and changes UI elements around so that the extension feels as part of Twitter itself. While that is the most fragile and unstable method of doing it, I felt like that would be an acceptable tradeoff.

> [!TIP]
> You can check whether anything broke by using the popup:
>
> <img width="50%" src="docs/img/popup.png"/>

### But is it private?

Yes! The "decking" action itself makes **zero API requests** and everything is stored **locally**. [You can read more in the Privacy Policy](PRIVACY.md).

## [Limitations](#limitations)

### Ratelimits

yeah

## [TODO](#todo)

There are some things I'd like to implement in the future but chose not to for the first version of the extension:

- [ ] Importing/exporting tweets
    <details><summary>Details</summary><p>meow</p></details>
- [ ] Downloading decks (similar to [booksave](https://github.com/nedoxff/booksave)) 
    <details><summary>Details</summary><p>bark</p></details>
- [ ] Selecting multiple tweets in a deck (and actions with them, e.g. move, undeck, etc.)
    <details><summary>Details</summary><p>moo</p></details>

## [Issues/Contributing](#issuescontributing)

😺