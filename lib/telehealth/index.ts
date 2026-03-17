import { PlaceholderTelehealthAdapter } from "@/lib/telehealth/placeholderAdapter";
import { TelehealthVisitAdapter } from "@/lib/telehealth/types";

let adapterInstance: TelehealthVisitAdapter | null = null;

export function getTelehealthVisitAdapter(): TelehealthVisitAdapter {
  if (adapterInstance) return adapterInstance;

  // TODO: Replace the placeholder adapter with an Amazon Chime SDK-backed adapter
  // after credentials, meeting orchestration, recording policy, and compliance review are in place.
  adapterInstance = new PlaceholderTelehealthAdapter();
  return adapterInstance;
}
