import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "../backend/public",
		emptyOutDir: true
	},
	server: {
		port: 5173,
		proxy: {
			"/socket.io": {
				target: "https://friendly-chebakia-39521d.netlify.app",
				ws: true
			}
		}
	}
});
