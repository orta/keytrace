/**
 * GET /api/services
 *
 * Get all available service providers with their UI configuration.
 * Used by the add claim wizard to display service options and instructions.
 */

import { serviceProviders } from "@keytrace/runner";

export default defineEventHandler(() => {
  const providers = serviceProviders.getAllProviders();

  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    homepage: provider.homepage,
    ui: provider.ui,
  }));
});
