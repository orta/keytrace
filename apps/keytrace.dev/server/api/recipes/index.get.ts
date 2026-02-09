/**
 * GET /api/recipes
 *
 * List all available service providers/recipes.
 */

import { serviceProviders } from "@keytrace/runner";

export default defineEventHandler(async () => {
  const providers = serviceProviders.getAllProviders();

  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    description: provider.description,
    homepage: provider.homepage,
    isAmbiguous: provider.isAmbiguous ?? false,
  }));
});
