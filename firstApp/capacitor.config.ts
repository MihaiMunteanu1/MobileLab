import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'firstApp',
  webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
  plugins: {
    Camera: {
        permissions: ['camera', 'photos']
    }
  }
};

export default config;
