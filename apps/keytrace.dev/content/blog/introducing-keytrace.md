---
title: Introducing Keytrace
description: Keytrace lets you cryptographically link your atproto/Bluesky account to external accounts across the web.
date: 2026-03-22
author: orta
---

What problem does Keytrace solve? It asks: _how can you prove that you own another account on the internet_? I am [@orta](https://github.com/orta) on GitHub, and [@orta](https://npmx.dev/org/orta) on npm but I'm not @orta on linkedin - someone beat me there! So, it might be a good guess that I got an '@orta' account somewhere first but it's not that easy to claim a 4 character handle. You could know my website: [orta.io](https://orta.io/) and then assume that the links on there are a good source of truth, but I could say anything I want on my website!

People who have used Bluesky might be aware of how handles work there, my handle on Bluesky ([@orta.io](https://bsky.app/profile/orta.io)) is my website. To 'claim' that handle, I had to prove I owned the website via DNS. It's a bi-directional relationship where both point to each other.

Keytrace extends that type of relationship to other accounts on the internet: Reddit, GitHub, npm, Twitter/X, LinkedIn, Instagram, Mastodon and more. Keytrace will walk you through the process of making some form of user content to prove your ownership by linking back to your atproto/Bluesky account. Then Keytrace provides an open-source library to verify that connection and which can run from this website.

This idea is not new. Back in 2014, I signed up with Keybase and proved I owned my [GitHub account](https://gist.github.com/orta/9589737/revisions) for them. But, I think it is worth talking about the changes I have made in architecting how Keytrace works.

Keybase was/is an extension of the [PGP Keyserver](<https://en.wikipedia.org/wiki/Key_server_(cryptographic)>) concept, where you had a central place for people to put their public PGP keys, and the Keybase CLI (or website if you gave them your PGP private key) would be able to do a lot of interesting cryptography things. Keybase [did a lot](https://book.keybase.io). The part that I think really stuck around in people's minds is "[Proofs](https://book.keybase.io/account#proofs)" which are bi-directional verified proofs:

![https://book.keybase.io/static/img/kb-three-accounts.png](https://book.keybase.io/static/img/kb-three-accounts.png)

Your PGP key was used to make a cryptographically signed message on the other account, and then separately Keybase's API would verify proofs by reading that website's public pages to compare the data.

Keytrace evolves this model:

- Data isn't stored on Keytrace's servers, so, no risk of me getting bored and stopping the project
- Data can be posted by other people's systems, anyone can verify or check other people's verifications
- Keytrace's system for the proof verification is open-source and available for others to use on [npm](https://npmx.dev/package/@keytrace/runner)
- The data is structured so that Keytrace can offer an API which only requires GET requests and the capacity to handle some web standards to prove that the data was 100% verified by Keytrace, and hasn't been touched since

That said, I make a pretty big breaking change though:

- PGP isn't the primary identification around which the system is based, your atproto account (and by-proxy it's unique identifier (DID) is)

PGP is well used in certain subsets of the net, but I'd like Keytrace to be more broadly available than focusing on just those folks. So, you can use Keytrace to put your public PGP keys on atproto - I have verified the same PGP key I use for Keybase! However, Keytrace is a bit more focused on user/developer convenience at the expense of being PGP-oriented.

With that said, I have a second, [more technical write-up](/blog/how-keytrace-works) so that people can audit the details, but you're welcome to verify, use and improve Keytrace with me!
