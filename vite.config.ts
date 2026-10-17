import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: "/vc_email_crm/",
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  },
  tanstackStart: {
    server: { entry: "server" },
    router: {
      basepath: "/vc_email_crm",
    },
  },
  nitro: {
    preset: "node-server",
  },
});


