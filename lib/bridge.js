'use strict';

const SERVER_URL = 'https://api.note1.ai/mcp';
const TOKEN_ENV = 'NOTE1_API_TOKEN';
const AUTH_HEADER_ENV = 'NOTE1_AUTH_HEADER';
const TOKEN_PREFIX = 'n1_';
const TOKENS_URL = 'https://note1.ai/dashboard/account/tokens';

const buildBrowserSignInMessage = () => [
  `note1-mcp: ${TOKEN_ENV} is not set, so sign in to note1 in your browser when the sign-in page opens.`,
  `On a machine without a browser (SSH, CI, containers), set ${TOKEN_ENV} to a token from ${TOKENS_URL} instead.`,
].join('\n');

const resolveConfig = env => {
  const token = env[TOKEN_ENV];
  if (token && !token.startsWith(TOKEN_PREFIX)) {
    return { error: `note1-mcp: ${TOKEN_ENV} must be a note1 personal access token (${TOKEN_PREFIX}...). Create one at ${TOKENS_URL}.` };
  }

  return token ? { token, url: SERVER_URL } : { url: SERVER_URL };
};

// keep the token out of argv, mcp-remote expands ${NOTE1_AUTH_HEADER} from its environment;
// without a token, mcp-remote signs in with OAuth
const buildArgs = options => {
  const {
    mcpRemoteBin, url, useToken, extraArgs,
  } = options;
  const header = useToken ? ['--header', `Authorization:\${${AUTH_HEADER_ENV}}`] : [];
  return [mcpRemoteBin, url, ...header, ...extraArgs];
};

const buildEnv = (env, token) => (token ? { ...env, [AUTH_HEADER_ENV]: `Bearer ${token}` } : { ...env });

module.exports = {
  SERVER_URL,
  TOKEN_ENV,
  AUTH_HEADER_ENV,
  TOKEN_PREFIX,
  TOKENS_URL,
  browserSignInMessage: buildBrowserSignInMessage,
  resolveConfig,
  buildArgs,
  buildEnv,
};
