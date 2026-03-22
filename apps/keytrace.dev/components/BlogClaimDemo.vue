<template>
  <div class="max-w-md my-6 mx-auto">
    <ClaimCard :claim="claim">
      <template #actions>
        <VerifyPopover claim-uri="https://www.instagram.com/p/DVS8Tm6DWzP/" did="did:plc:t732otzqvkch7zz5d37537ry" display-name="Orta Therox" provider-name="Instagram" />
      </template>
    </ClaimCard>
  </div>
</template>

<script setup lang="ts">
const claim = {
  displayName: "Orta Therox",
  status: "verified" as const,
  serviceType: "instagram",
  createdAt: "2026-03-21T22:57:58.939Z",
  lastVerifiedAt: "2026-03-21T22:57:58.939Z",
  identity: {
    subject: "orta",
    profileUrl: "https://www.instagram.com/orta/",
    displayName: "Orta Therox",
  },
};
</script>
