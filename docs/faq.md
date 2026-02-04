## [How do I get that Pinterest view like in the README?](#how-do-i-get-the-pinterest-view-like-in-the-readme)

You can change the deck's view mode by pressing the three dots either in the Decks page or inside the deck itself and then "Edit deck":

<p align="center">
    <img height="200" src="img/faq/edit-from-deck.png"/>
    <img height="200" src="img/faq/edit-from-viewer.png"/>
</p>

<p align="center">
    <img width="50%" src="img/faq/edit-deck-modal.png"/>
</p>

## [I can't reorder some tweets in the deck?](#i-cant-reorder-some-tweets-in-the-deck)

> [!NOTE]
> This doesn't apply to the Default view mode.

There are some quirks with reordering tweets when using Masonry view mode.

- If a tweet consists of multiple images, they cannot be reordered with each other (the order will reset upon reloading the page)
- If a tweet is a quote of a different tweet (and the "Include quoted tweets" option is on), then the quoted tweet cannot be reordered with any other tweets in the deck.

This is due to the fact that the quoted tweets and images are still *technically* attached to the same single tweet, meaning that when the page reloads the natural order in which the images were stored will be restored.

> This is fix-able and is currently in the [TODOs](../README.md#todo).