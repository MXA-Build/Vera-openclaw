import { definePluginEntry, type OpenClawPluginApi } from "./runtime-api.js";
import { resolveVoiceReplyConfig } from "./src/config.js";
import { VoiceReplyServer } from "./src/http-server.js";
import { createReplyHandler } from "./src/runtime.js";

const voiceReplyConfigSchema = {
  parse(value: unknown) {
    return resolveVoiceReplyConfig(value);
  },
  uiHints: {
    enabled: { label: "Enable Voice Reply Endpoint" },
    "serve.port": { label: "HTTP Port" },
    "serve.bind": { label: "HTTP Bind" },
    "serve.path": { label: "HTTP Path" },
  },
};

export default definePluginEntry({
  id: "voice-reply",
  name: "Voice Reply",
  description: "Synchronous HTTP reply endpoint for the Twilio voice router",
  configSchema: voiceReplyConfigSchema,
  register(api: OpenClawPluginApi) {
    const config = resolveVoiceReplyConfig(api.pluginConfig);
    let server: VoiceReplyServer | null = null;

    api.registerService({
      id: "voice-reply",
      start: async () => {
        if (!config.enabled) {
          return;
        }
        const token = process.env.OPENCLAW_GATEWAY_TOKEN ?? "";
        if (!token) {
          api.logger.warn(
            "[voice-reply] OPENCLAW_GATEWAY_TOKEN not set — endpoint will reject all requests (401)",
          );
        }
        server = new VoiceReplyServer(
          {
            port: config.serve.port,
            bind: config.serve.bind,
            path: config.serve.path,
            gatewayToken: token,
          },
          createReplyHandler({ logger: api.logger }),
          api.logger,
        );
        await server.start();
      },
      stop: async () => {
        if (server) {
          await server.stop();
          server = null;
        }
      },
    });
  },
});
