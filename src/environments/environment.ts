export const environment = {
  production: true,
  apiUrl: 'http://localhost:8080/api',
  azure: {
    tenantId: '85285dad-32cb-460f-ac7f-a654027af079',
    clientId: '91450f63-2a70-428b-bb55-1aec937e0dc8',
    scope: 'api://91450f63-2a70-428b-bb55-1aec937e0dc8/access_as_user',
    redirectUri: 'http://localhost:4200/',
    postLogoutRedirectUri: 'http://localhost:4200/',
  },
};

