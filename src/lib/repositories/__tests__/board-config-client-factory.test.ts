import { getBoardConfigClient } from "../client/board-config-client-factory";

import { BoardConfigClientLocal } from "../client/boardconfig-client-local";
import { BoardConfigClientServer } from "../client/boardconfig-client-server";

const originalEnv = process.env;

describe('BoardConfigFactory returns ', () => {

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv
    };
    jest.clearAllMocks;

  });

  it('returns local storage client if deployment is serverless', () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_PERSISTENCE_MODE: 'local'
    };

    const client = getBoardConfigClient();

    expect(client).toBeInstanceOf(BoardConfigClientLocal);
  });

  it('returns server client if deployment is db', () => {
    process.env = {
      ...process.env,
      NEXT_PUBLIC_PERSISTENCE_MODE: 'server'
    };

    const client = getBoardConfigClient();

    expect(client).toBeInstanceOf(BoardConfigClientServer);
  });

  it('returns local client if env variable is not present', () => {
    const client = getBoardConfigClient();

    expect(client).toBeInstanceOf(BoardConfigClientLocal);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

});