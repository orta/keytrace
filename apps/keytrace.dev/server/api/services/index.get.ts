/**
 * GET /api/services
 *
 * List all available service providers.
 */

import { serviceProviders } from "@keytrace/runner";

export default defineEventHandler(async () => {
  const providers = serviceProviders.getAllProviders();

  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    description: provider.ui.description,
    homepage: provider.homepage,
    isAmbiguous: provider.isAmbiguous ?? false,
  }));
});
