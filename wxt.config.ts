import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Releaf',
    description: 'AI-powered writing assistant for Overleaf',
    permissions: ['storage', 'activeTab'],
    host_permissions: [
      'https://www.overleaf.com/*',
      'https://claude.ai/*',
    ],
  },
});
