<template>
  <section class="relative border-t border-b border-zinc-800 mt-12" style="background: linear-gradient(180deg, var(--kt-bg-root) 0%, rgba(19, 17, 28, 0.5) 100%)">
    <div class="max-w-[1120px] mx-auto px-6 py-[88px]">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <!-- Left: copy + benefits -->
        <div>
          <SectionLabel num="§3" label="For atproto developers" />

          <h2 class="mt-3 text-[clamp(32px,3.6vw,44px)] font-semibold tracking-[-0.02em] text-zinc-100 leading-[1.08]">
            Same lexicon. Same libraries.<br />
            <span class="text-violet-400">Your identity layer.</span>
          </h2>

          <p class="mt-4 text-[15px] text-zinc-400 leading-relaxed max-w-[480px]">
            Keytrace is built on <span class="text-zinc-200 font-mono text-[13px]">dev.keytrace.*</span> — an open atproto lexicon. Anything Keytrace can read, your app can read.
            Everything we verify, you can re-verify. Nothing is locked behind our API.
          </p>

          <!-- benefits list -->
          <div class="mt-6 grid grid-cols-1 gap-2.5">
            <div v-for="b in benefits" :key="b.t" class="flex gap-3 items-start p-3.5 bg-kt-surface border border-zinc-800 rounded-lg">
              <div class="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                <component :is="b.icon" class="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div>
                <div class="text-[13px] font-medium text-zinc-100">{{ b.t }}</div>
                <div class="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  {{ b.d }}
                  <template v-if="b.links">
                    <a
                      v-for="link in b.links"
                      :key="link.href"
                      :href="link.href"
                      target="_blank"
                      rel="noopener"
                      class="text-violet-400 hover:text-violet-300 transition-colors no-underline ml-0.5"
                      >{{ link.label }}</a
                    >
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-7 flex gap-2.5 flex-wrap">
            <NuxtLink
              to="/developers"
              class="px-4 py-2.5 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-transparent hover:bg-white/[0.04] text-[13px] font-medium rounded-lg transition-all no-underline"
            >
              Read the docs &rarr;
            </NuxtLink>
            <a
              href="https://github.com/orta/keytrace"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs text-zinc-400 no-underline hover:text-zinc-300 transition-colors"
            >
              <GithubIcon class="w-3.5 h-3.5 text-zinc-400" />
              orta/keytrace
            </a>
          </div>
        </div>

        <!-- Right: tabbed editor -->
        <div>
          <div class="rounded-xl overflow-hidden bg-kt-inset border border-zinc-800" style="box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45)">
            <!-- tab bar -->
            <div class="flex bg-kt-surface border-b border-zinc-800">
              <button
                v-for="t in tabs"
                :key="t.id"
                class="flex items-center gap-[7px] px-3.5 py-3 bg-transparent border-0 text-xs font-medium cursor-pointer transition-all"
                :class="active === t.id ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
                :style="{ borderBottom: `2px solid ${active === t.id ? '#8b5cf6' : 'transparent'}` }"
                @click="active = t.id"
              >
                <component :is="t.iconComp" class="w-3 h-3" :class="active === t.id ? 'text-violet-500' : 'text-zinc-500'" />
                {{ t.label }}
              </button>
              <div class="flex-1" style="border-bottom: 2px solid transparent" />
            </div>

            <!-- filename strip -->
            <div class="px-3.5 py-2 font-mono text-[11px] text-zinc-500 border-b border-zinc-800 bg-kt-inset flex items-center gap-2.5">
              <FileIcon class="w-[11px] h-[11px] text-zinc-600" />
              {{ currentTab.filename }}
              <span class="flex-1" />
              <span class="text-zinc-600">{{ currentTab.lang }}</span>
            </div>

            <!-- code body -->
            <pre
              class="m-0 px-5 py-4 font-mono text-[12.5px] leading-[1.7] text-zinc-300 overflow-x-auto bg-kt-inset"
              style="min-height: 340px; max-height: 340px"
              v-html="highlightedCode"
            />

            <!-- footer -->
            <div class="px-3.5 py-3 border-t border-zinc-800 flex items-center gap-4 flex-wrap text-xs text-zinc-500 bg-kt-surface/50">
              <span>{{ currentTab.note }}</span>
              <span class="flex-1" />
              <a v-for="(l, i) in currentTab.links" :key="i" :href="l.href" class="text-violet-400 no-underline font-mono text-xs hover:text-violet-300 transition-colors">
                {{ l.label }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { GitBranch, Package as PackageIcon, Radio, ShieldCheck, Github as GithubIcon, FileJson, Cpu, FileText, File as FileIcon } from "lucide-vue-next";
import claimLexicon from "@keytrace/lexicon/lexicons/dev/keytrace/claim.json";

const benefits = [
  { icon: GitBranch, t: "Open lexicons", d: "Schemas published in the orta/keytrace monorepo." },
  {
    icon: PackageIcon,
    t: "Convenience packages",
    d: "",
    links: [
      { label: "@keytrace/claims", href: "https://npmx.dev/package/@keytrace/claims" },
      { label: " · @keytrace/lexicon", href: "https://npmx.dev/package/@keytrace/lexicon" },
    ],
  },
  {
    icon: Radio,
    t: "Run the runner",
    d: "Use @keytrace/runner in your own projects to verify claims.",
    links: [{ label: "npmx →", href: "https://npmx.dev/package/@keytrace/runner" }],
  },
  { icon: ShieldCheck, t: "Portable across PDSes", d: "Records live in the user's repo. Keytrace is not a silo." },
];

const tabs = [
  {
    id: "lexicon",
    label: "Lexicon",
    iconComp: FileJson,
    filename: "dev.keytrace.claim.json",
    lang: "json",
    body: JSON.stringify(claimLexicon, null, 2),
    links: [{ label: "github.com/orta/keytrace/lexicon", href: "https://github.com/orta/keytrace/tree/main/packages/lexicon" }],
    note: "Model the claim yourself. The whole schema lives in an open repo.",
  },
  {
    id: "sdk",
    label: "Claims",
    iconComp: PackageIcon,
    filename: "verify-claims.ts",
    lang: "ts",
    body: `import { getClaimsForHandle } from "@keytrace/claims";

// Verify all claims for a handle
const result = await getClaimsForHandle("orta.io");

console.log(\`\${result.summary.verified}/\${result.summary.total} claims verified\`);

for (const claim of result.claims) {
  if (claim.verified) {
    console.log(\`✓ \${claim.type}: \${claim.identity.subject}\`);
  } else {
    console.log(\`✗ \${claim.type}: \${claim.error}\`);
  }
}

// Or verify by DID directly
const result2 = await getClaimsForDid("did:plc:t732otzqvkch7zz5d37537ry");`,
    links: [{ label: "@keytrace/claims", href: "https://npmx.dev/package/@keytrace/claims" }],
    note: "Zero dependencies. Uses standard fetch and crypto.subtle APIs. Works in Node, Deno, browsers, and Cloudflare Workers.",
  },
  {
    id: "runner",
    label: "Runner",
    iconComp: Cpu,
    filename: "verifier.ts",
    lang: "ts",
    body: `import { createClaim, verifyClaim, ClaimStatus } from "@keytrace/runner";
import { serviceProviders } from "@keytrace/runner";

// Create and verify a claim
const claim = createClaim(
  "https://gist.github.com/orta/b7dccdfb08e7fbb855337a444b62e2d3",
  "did:plc:t732otzqvkch7zz5d37537ry"
);

const result = await verifyClaim(claim);

if (result.status === ClaimStatus.VERIFIED) {
  console.log("Claim verified!", result.identity);
}

// Match URIs to service providers
const matches = serviceProviders.matchUri(
  "https://gist.github.com/orta/b7dccdfb..."
);
// [{ provider: { id: "github", name: "GitHub" }, ... }]`,
    links: [{ label: "@keytrace/runner", href: "https://npmx.dev/package/@keytrace/runner" }],
    note: "The same verifier keytrace.dev runs on its server. Use it in your own backend.",
  },
  {
    id: "record",
    label: "Claim record",
    iconComp: FileText,
    filename: "at://did:plc:t732…/dev.keytrace.claim/3mhsibfhjph2f",
    lang: "json",
    body: `{
  "$type":          "dev.keytrace.claim",
  "type":           "github",
  "status":         "verified",
  "claimUri":       "https://gist.github.com/orta/b7dccdfb08e7fbb8…",
  "identity": {
    "subject":      "orta",
    "avatarUrl":    "https://avatars.githubusercontent.com/u/49038",
    "profileUrl":   "https://github.com/orta"
  },
  "sigs": [
    {
      "kid":          "attest:github",
      "src":          "at://did:plc:hcwf…/dev.keytrace.serverPublicKey/2026-03-24",
      "signedAt":     "2026-03-24T11:36:08.121Z",
      "signedFields": ["claimUri", "did", "identity.subject", "type"],
      "attestation":  "eyJhbGciOiJFUzI1NiIs…"
    }
  ],
  "createdAt":      "2026-03-24T11:36:08.185Z",
  "lastVerifiedAt": "2026-03-27T08:31:46.682Z"
}`,
    links: [{ label: "view on pdsls.dev", href: "https://pdsls.dev/at://did:plc:t732otzqvkch7zz5d37537ry/dev.keytrace.claim/3mhsibfhjph2f" }],
    note: "Stored in the user's own repo. Portable across PDSes. Revocable by deletion.",
  },
];

const active = ref("lexicon");
const currentTab = computed(() => tabs.find((t) => t.id === active.value) || tabs[0]);

const highlightedCode = computed(() => {
  const tab = currentTab.value;
  return highlight(tab.body, tab.lang);
});

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(src: string, lang: string) {
  let s = esc(src);

  if (lang === "json") {
    s = s.replace(/"([^"]+)"(\s*:)/g, (_, k, c) => `<span class="text-violet-400">"${k}"</span>${c}`);
    s = s.replace(/:\s*"([^"]*)"/g, (_, v) => `: <span class="text-emerald-400">"${v}"</span>`);
    s = s.replace(/:\s*(\d+)(\b)/g, (_, n, b) => `: <span class="text-amber-400">${n}</span>${b}`);
    s = s.replace(/(^|\s)(\/\/[^\n]*)/gm, '$1<span class="text-zinc-600">$2</span>');
  } else if (lang === "ts") {
    // Extract comments first so their content isn't matched by later passes
    const comments: string[] = [];
    s = s.replace(/(^|\s)(\/\/[^\n]*)/gm, (_m, pre, comment) => {
      comments.push(comment);
      return `${pre}__COMMENT_${comments.length - 1}__`;
    });
    s = s.replace(/(["'`])([^"'`\n]*?)\1/g, '<span class="text-emerald-400">$1$2$1</span>');
    s = s.replace(/\b(import|from|const|let|var|for|await|of|if|else|return|new|async|function|export)\b/g, '<span class="text-violet-500">$1</span>');
    s = s.replace(/\b(Keytrace|Runner|Uint8Array|Array|Promise|ClaimStatus)\b/g, '<span class="text-violet-400">$1</span>');
    // Restore comments with styling
    s = s.replace(/__COMMENT_(\d+)__/g, (_, i) => `<span class="text-zinc-600">${comments[Number(i)]}</span>`);
  }
  return s;
}
</script>
