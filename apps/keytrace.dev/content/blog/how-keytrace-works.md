---
title: How Keytrace works
description: A technical write-up of how the parts of Keytrace come together to validate account claims, and allow third-parties to trust our validations without verifying every claim themselves
date: 2026-03-22
author: orta
---

So how does Keytrace work? First off, lets set up our Keytrace vocabulary:

- `claim` - An external account you are claiming ownership for (e.g. github.com/orta)
- `service provider` - The "place" which hosts said account (e.g. GitHub)
- `runner` - A task runner which checks the service provider via public APIs, DNS or HTML scraping to verify an user's claim publicly

Next, some Bluesky/atproto terminology:

- `atproto` - the tech foundation which Bluesky is built on, which Keytrace is also built on
- `DID` - A unique identifier on the atproto network, you have one
- `repository` - A set of JSON blobs attached to your DID which makes up the data for your account
- `document` - The name of an individual JSON blob in your registry
- `collection` - A subset of your repository where the documents all have the same file format (`$type`), these collections are based on inverse URLs: e.g. `dev.keytrace.claim`.

## Walkthrough

OK, lets talk you through the process of making a single claim, and ideally you'll have a good understanding of claim-making and verification process by going step-by-step.

### Signing Up

When you sign in to Keytrace, we ask for access to be able to make read/write changes to the collection `dev.keytrace.claim` on your atproto account.

Signing in gives the Keytrace server a way to store your claim in your own account's repository. Today, Keytrace does not operate with a database, almost everything stored exists in a user's atproto repository, or the keytrace.dev's atproto repository (except private keys.)

Clicking 'Add claim' on the website would take you to a page showing a lot of different server providers, for example GitHub, Mastodon, npm, Twitter, LinkedIn etc. Note: I am a maximalist here, if we can figure a way to publicly prove you own an account (e.g. you can create public content,) I'm happy to have support for that service provider.

### Making a Claim

Lets use Instagram as a reference point, it's a tricky platform to get data from! Today the steps to create a claim for Instagram looks like:

::BlogProofDemo
::

So, we require you to make a public post, and include a very specific string: `I'm linking my keytrace.dev: did:plc:t732otzqvkch7zz5d37537ry`. The essential bit of information here is `did:plc:t732otzqvkch7zz5d37537ry` which is my personal DID.

I would then go to Instagram's app, or the web interface and [create an image post](https://www.instagram.com/p/DVS8Tm6DWzP/) which includes that text. After I come back to Keytrace, I give the post URL `https://www.instagram.com/p/DVS8Tm6DWzP/` to the form, which triggers the Keytrace runner to start.

In this case, the runner will download the HTML of the post and then extract out the [meta tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta) from the content of the page:

```html
<!DOCTYPE html>
<html class="_9dls _ar44" lang="en" dir="ltr">
  <head>
    <meta
      property="og:description"
      content='13 likes, 2 comments - orta on February 28, 2026: "Linking my http://keytrace.dev
 - did:plc:t732otzqvkch7zz5d37537ry". '
    />
    <!-- The rest of the page -->
  </head>
</html>
```

Luckily for us, that message is short enough to be included in full via the meta tag `"description"` on the Instagram website.

The runner's service provider for Instagram knows to look for your DID in that tag. If it is there, then the runner considers the proof valid. We only accept certain Instagram URL formats, so you can't leave a comment on someone elses post with your DID to claim their accounts etc.

The Instagram provider uses the metadata from the HTML, but other providers use:

- DNS (for websites you own)
- ActivityPub (for Mastodon instances)
- Public JSON APIs (e.g. Reddit)
- CSS scope narrowing in HTML (e.g. Hacker News)
- JSON+ld in HTML (e.g. LinkedIn)

Each time it's a mix of 'how accurate can this be?', 'how available is the data?' and 'how can this to be abused?' - never a simple thing but I've tried to think through each one pretty hard.

## Creating a Claim

A [verified claim](https://pdsls.dev/at://did:plc:t732otzqvkch7zz5d37537ry/dev.keytrace.claim/3mhm4xuzxbq2f) is a JSON document posted to your atproto repository:

```jsonc
{
  "$type": "dev.keytrace.claim",
  "type": "instagram",
  "status": "verified",
  "claimUri": "https://www.instagram.com/p/DVS8Tm6DWzP/",
  "identity": {
    "subject": "orta",
    "avatarUrl": "https://scontent-lhr6-1.cdninstagram.com/...",
    "profileUrl": "https://www.instagram.com/orta/",
    "displayName": "Orta Therox",
  },
  "createdAt": "2026-03-21T22:57:58.939Z",
  "lastVerifiedAt": "2026-03-21T22:57:58.939Z",
  "sigs": [
    // We'll look at this later
  ],
}
```

It's quite simple, it declares the URL you used to make the claim, gives a verified status, and then has a structured `"identity"` which gives enough information to show the claim in an interface.

All in all, quite simple!

This data on your account is enough to re-trigger the Keytrace runner: `https://www.instagram.com/p/DVS8Tm6DWzP` and look for the Claim owner's DID: `did:plc:t732otzqvkch7zz5d37537ry`. Clicking the spinner below will run the real code.

::BlogClaimDemo
::

Given the small-world nature of atproto, while Keytrace was in alpha, I had long conversations with both [kt-tools](https://codeberg.org/uwedeportivo/kt-tool) and [attestfor.me](https://attestfor.me/) and we all shipped using the same data structures, making us all compatible.

So, you can verify a claim from any three system on the CLI via:

```text
kt-tool verify --handle orta.io
```

Maybe sometime in the future we can have a Keytrace CLI too! This is one of the cool things about having the '[social filesystem](https://overreacted.io/a-social-filesystem/)' of atproto. It's very collaborative and very interesting!

Right now, [@sifa.id](https://bsky.app/profile/sifa.id) is showing Keytrace claims (here's [mine](https://sifa.id/p/orta.io)), I'm thinking of adding it to a Puzzmo user profile, and [npmx](https://npmx.dev/) are interested in using claims as a way to prove you have write access to a package too. Lots of cross-pollination for a new project!

## Trusting a Claim

Oddly enough, I think this is not enough.

Why? Well, one advantage Keybase had was that they controlled all access to their data in the db. Whereas a document in a user's repository is mutable data which any application can request access to, I can't say 'only Keytrace can write to this' (nor do I want to) which means any of these documents should not be _fully_ trusted.

E.g. I could change my handle to be Taylor Swift's and unless someone re-runs the full process for verification, they may not cast question on the validity of the data:

![Screenshot of pdsls editing](/editing-my-handle.png)

Thus: attestation. A fancy word to say 'a receipt for data.' Keytrace offers a secondary system for a claim verification via document field validation. This is system which generates signatures that rely on common web standards like atproto resolution, JSON Canonicalization Scheme, JSON Web Tokens (JWT) and JSON Web Keys (JWK) and subtle crypto.

The `"sigs"` is an array of signatures that verify a set of fields from inside the JSON document (with `"did"` injected from outside.) Here is the primary signature which Keytrace creates on a claim:

```jsonc
{
  "sigs": [
    {
      "kid": "attest:instagram",
      "src": "at://did:plc:hcwfdlmprcc335oixyfsw7u3/dev.keytrace.serverPublicKey/2026-03-21",
      "signedAt": "2026-03-21T22:57:57.906Z",
      "attestation": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGFpbVVyaSI6Imh0dHBzOi8vd3d3Lmluc3RhZ3JhbS5jb20vcC9EVlM4VG02RFd6UC8iLCJkaWQiOiJkaWQ6cGxjOnQ3MzJvdHpxdmtjaDd6ejVkMzc1MzdyeSIsImlkZW50aXR5LnN1YmplY3QiOiJvcnRhIiwidHlwZSI6Imluc3RhZ3JhbSJ9.LtZiwSSTvZMgq4Y16ZWTrzR3l-xPcbTIinrh3lNM0mohR5u7XPTTNK_Owk25_XJVLNKOeA88Emkkxk96R3hY9w",
      "signedFields": ["claimUri", "did", "identity.subject", "type"],
    },
    // ...
  ],
  "type": "instagram",
  "claimUri": "https://www.instagram.com/p/DVS8Tm6DWzP/",
  "identity": {
    "subject": "orta",
    //...
  },
  // ...
}
```

We have:

- `kid` - a Key ID, basically just a name to declare what it does
- `src` - an atproto address of a `dev.keytrace.serverPublicKey` record, in this case on `did:plc:hcwfdlmprcc335oixyfsw7u3` (which is [@keytrace.dev](https://pdsls.dev/at://did:plc:hcwfdlmprcc335oixyfsw7u3))
- `signedAt` - the date
- `attestation` - a JWT string which we'll go into next
- `signedFields` - a list of fields from the document which were signed inside the attestation string

### `attestation`

The `attestation` value is a JWT, a JWT is a string composed of three parts separated by a `.`: `[header].[payload].[signature]`. Both the header and payload are JSON objects which are base64 encoded. The header describes the algorithm used for signing and type, the payload is whatever you want.

::JwtDecoder{jwt="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGFpbVVyaSI6Imh0dHBzOi8vd3d3Lmluc3RhZ3JhbS5jb20vcC9EVlM4VG02RFd6UC8iLCJkaWQiOiJkaWQ6cGxjOnQ3MzJvdHpxdmtjaDd6ejVkMzc1MzdyeSIsImlkZW50aXR5LnN1YmplY3QiOiJvcnRhIiwidHlwZSI6Imluc3RhZ3JhbSJ9.LtZiwSSTvZMgq4Y16ZWTrzR3l-xPcbTIinrh3lNM0mohR5u7XPTTNK_Owk25_XJVLNKOeA88Emkkxk96R3hY9w"}
::

The payload is a JSON object created by using canonicalized JSON formatting ([RFC 8785](https://datatracker.ietf.org/doc/html/rfc8785)), so you pluck the values declared in `signedFields`, turn that into an object, then ensure that you canonicalize the JSON as it is being serialized into a string. This is largely just making sure the order of fields, and string escaping etc is consistent across any language/environment.

I tend to verify and inspect my JWTs in [jwt.io](https://www.jwt.io/), but lets look at that soon. Next we need to resolve `at://did:plc:hcwfdlmprcc335oixyfsw7u3/dev.keytrace.serverPublicKey/2026-03-21`. This is an atproto address to a document with the name `2026-03-21` in the collection `dev.keytrace.serverPublicKey` of the account `did:plc:hcwfdlmprcc335oixyfsw7u3`. [That document](https://pdsls.dev/at://did:plc:hcwfdlmprcc335oixyfsw7u3/dev.keytrace.serverPublicKey/2026-03-21) looks like this:

```jsonc
{
  "$type": "dev.keytrace.serverPublicKey",
  "publicJwk": "{\"kty\":\"EC\",\"x\":\"F9YcOywzrNapbegB-_ZM_9jYJzGrGj5PjH-DrUTySQs\",\"y\":\"vN0rBTAPYwmsOJqc7ndcpa-PEFmPsksBcKxx2X-Nc9I\",\"crv\":\"P-256\"}",
  "validFrom": "2026-03-21T00:00:00.000Z",
  "validUntil": "2026-03-21T23:59:59.999Z",
}
```

I cycle Keytrace keys daily, but the document is essentially a way to wrap a JWK in a document with some metadata. This JWK is a public form of the private key used to sign the original `attestation` JWT. So, if you'd like to verify the attestation:

Open [jwt.io](https://www.jwt.io/):

- Set your JWT to be the one from the Claim:

::CopySnippet{value="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGFpbVVyaSI6Imh0dHBzOi8vd3d3Lmluc3RhZ3JhbS5jb20vcC9EVlM4VG02RFd6UC8iLCJkaWQiOiJkaWQ6cGxjOnQ3MzJvdHpxdmtjaDd6ejVkMzc1MzdyeSIsImlkZW50aXR5LnN1YmplY3QiOiJvcnRhIiwidHlwZSI6Imluc3RhZ3JhbSJ9.LtZiwSSTvZMgq4Y16ZWTrzR3l-xPcbTIinrh3lNM0mohR5u7XPTTNK_Owk25_XJVLNKOeA88Emkkxk96R3hY9w"}
::

- In **JWT Signature Verification** change the Public Key Format from PEM to JWK
- Set the public key to the one from the Server Public Key:

<!-- prettier-ignore -->
::CopySnippet{value='{"kty":"EC","x":"F9YcOywzrNapbegB-_ZM_9jYJzGrGj5PjH-DrUTySQs","y":"vN0rBTAPYwmsOJqc7ndcpa-PEFmPsksBcKxx2X-Nc9I","crv":"P-256"}'}
::

- See the tick! (Then verify it fails by changing the JWK or the JWT)

What you are looking at is proof that one of Keytrace's private keys looked at the data in this document and then signed off on it's correctness. All of this is standard atproto and web infrastructure. What is interesting is that now we have two ways to check the validity.

- Do the full verification process yourself
- Trust that Keytrace did the process, but you can double-check that the payload objects still matches the object if re-created from the document

Thus Keytrace comes with not one, but two open source libraries:

- [`@keytrace/runner`](https://npmx.dev/package/@keytrace/runner) - A heavy 'run the full verification' system
- [`@keytrace/claims`](https://npmx.dev/package/@keytrace/claims) - A light 'grab the claims, validate they are correct' library for third-parties to use

That's it! That's the system.

The whole thing is open source at [orta/keytrace](https://github.com/orta/keytrace), I'll take issues but mainly only on weekends. I'm open to adding new types of accounts!

One of the side-projects I'm not sure if I will build, but I have a prototype is a public relay chat system for Keytrace. So, Keytrace hosts a bot on lots of different platforms (Signal, Whatsapp, Telegram, etc) and any messages sent to that bot are posted to a public page we host via web socket. Then any messages containing a DID are stored in our backend, Keytrace would then have a public API for looking up those messages. Which I think gives us a way to crack into a set of account systems which have no public presence.

Other than that, it's been fun having a side project! I started thinking about Keytrace back in [Jan 2025](https://bsky.app/profile/orta.io/post/3mdkzofxkf22n) and have been working on it on the side a 2 months now. It's been a bit of a cultural change to have a real side-project I haven't really had a new one since I started working on [Puzzmo](https://www.puzzmo.com) 5 years ago.
