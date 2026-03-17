import { MockTelehealthAdapter } from "@/services/telehealth/providers/mockTelehealth";
import { AmazonChimeAdapter } from "@/services/telehealth/providers/amazonChime";
import { TelehealthProvider } from "@/services/telehealth/types";

let adapterInstance: TelehealthProvider | null = null;

export function getTelehealthProvider(): TelehealthProvider {
  if (adapterInstance) return adapterInstance;

  const vendor = process.env.CAREBRIDGE_TELEHEALTH_VENDOR?.toLowerCase();

  if (vendor === "amazon-chime") {
    adapterInstance = new AmazonChimeAdapter();
    return adapterInstance;
  }

  adapterInstance = new MockTelehealthAdapter();
  return adapterInstance;
}
