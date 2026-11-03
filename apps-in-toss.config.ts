import { defineConfig } from '@apps-in-toss/web-framework/config';

// appName은 앱인토스 콘솔에 등록한 앱 이름(영문)과 반드시 같아야 해요.
export default defineConfig({
  appName: 'gwongrigeum',
  brand: {
    primaryColor: '#1F6F6A',
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  },
  permissions: [],
  webBundleDir: 'dist',
});
