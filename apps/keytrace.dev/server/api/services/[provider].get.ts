/**
 * GET /api/services/:provider
 *
 * Get verification details for a service provider.
 * Returns the provider info and verification steps.
 */

import { serviceProviders } from "@keytrace/runner";

export default defineEventHandler(async (event) => {
  const providerId = getRouterParam(event, "provider");

  if (!providerId) {
    throw createError({ statusCode: 400, statusMessage: "Missing provider ID" });
  }

  const provider = serviceProviders.getProvider(providerId);

  if (!provider) {
    throw createError({ statusCode: 404, statusMessage: "Provider not found" });
  }

  // Generate a sample processed URI for documentation
  const sampleUri = provider.tests.find((t) => t.shouldMatch)?.uri ?? "";
  const sampleMatch = sampleUri ? sampleUri.match(provider.reUri) : null;
  const sampleProcessed = sampleMatch ? provider.processURI(sampleUri, sampleMatch) : null;

  return {
    id: provider.id,
    name: provider.name,
    description: provider.description,
    homepage: provider.homepage,
    uriPattern: provider.reUri.source,
    isAmbiguous: provider.isAmbiguous ?? false,
    sampleUri,
    proofText: provider.getProofText("did:plc:example123456789012345678"),
    proofLocation: sampleMatch && provider.getProofLocation ? provider.getProofLocation(sampleMatch) : null,
    ui: provider.ui
      ? {
          instructions: provider.ui.instructions,
          proofTemplate: provider.ui.proofTemplate,
          inputLabel: provider.ui.inputLabel,
          inputPlaceholder: provider.ui.inputPlaceholder,
        }
      : null,
    verification: sampleProcessed
      ? {
          fetchUrl: sampleProcessed.proof.request.uri,
          fetcher: sampleProcessed.proof.request.fetcher,
          format: sampleProcessed.proof.request.format,
          targets: sampleProcessed.proof.target.map((t) => ({
            path: t.path.join("."),
            relation: t.relation,
            description: describeTarget(t.path, t.relation),
          })),
        }
      : null,
  };
});

function describeTarget(path: string[], relation: string): string {
  const pathStr = path.join(" → ");
  switch (relation) {
    case "contains":
      return `Check if ${pathStr} contains the DID`;
    case "equals":
      return `Check if ${pathStr} equals the DID`;
    case "startsWith":
      return `Check if ${pathStr} starts with the DID`;
    default:
      return `Check ${pathStr}`;
  }
}
