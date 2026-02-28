import type { Component } from "vue";
import {
  Github,
  Globe,
  AtSign,
  Cloud,
  Shield,
  Key,
  Twitter,
  Linkedin,
  Instagram,
  MessageSquare,
} from "lucide-vue-next";
import NpmIcon from "~/components/icons/NpmIcon.vue";
import TangledIcon from "~/components/icons/TangledIcon.vue";

/**
 * Canonical mapping from icon string (as defined in ServiceProviderUI.icon)
 * to Vue component. This is the ONE place to update when adding a custom icon.
 * Standard lucide icons just need the string name registered here.
 */
const iconMap: Record<string, Component> = {
  github: Github,
  globe: Globe,
  "at-sign": AtSign,
  cloud: Cloud,
  shield: Shield,
  npm: NpmIcon,
  tangled: TangledIcon,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  "message-square": MessageSquare,
};

interface ServiceFromAPI {
  id: string;
  name: string;
  homepage: string;
  ui: {
    description: string;
    icon: string;
    iconDisplay?: "badge" | "raw";
    inputLabel: string;
    inputPlaceholder: string;
    inputDefaultTemplate?: string;
    instructions: string[];
    proofTemplate: string;
    extraInputs?: Array<{
      key: string;
      label: string;
      placeholder: string;
      pattern?: string;
      patternError?: string;
    }>;
  };
}

/**
 * Single source of truth for service provider UI metadata.
 * Fetches provider data from /api/services (cached by Nuxt)
 * and maps icon strings to Vue components.
 */
export function useServiceRegistry() {
  const { data: services } = useFetch<ServiceFromAPI[]>("/api/services", {
    key: "service-registry",
  });

  function findProvider(typeId: string): ServiceFromAPI | undefined {
    return services.value?.find((s) => s.id === typeId);
  }

  /** Get the Vue icon component for a provider type ID */
  function getServiceIcon(typeId: string): Component {
    const provider = findProvider(typeId);
    if (provider) {
      return iconMap[provider.ui.icon] ?? Key;
    }
    return Key;
  }

  /** Get the display name for a provider type ID */
  function getServiceName(typeId: string): string {
    const provider = findProvider(typeId);
    if (provider) return provider.name;
    // Fallback: capitalize the type ID
    return typeId.charAt(0).toUpperCase() + typeId.slice(1);
  }

  /** Get icon display mode: "badge" (circle bg) or "raw" (standalone) */
  function getIconDisplay(typeId: string): "badge" | "raw" {
    const provider = findProvider(typeId);
    return provider?.ui.iconDisplay ?? "badge";
  }

  return {
    services,
    getServiceIcon,
    getServiceName,
    getIconDisplay,
    iconMap,
  };
}
