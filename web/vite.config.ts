import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Small SPA. The frontend talks only to Supabase auth/storage and the Edge
// Functions; no server-side secrets ever reach this bundle.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
