/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 * @format
 * @emails oncall+nuclide
 */
import {
  type ConnectionProfileConfiguration,
  ProfileConfigurationParser,
} from '../src/configuration/ProfileConfigurationParser';
import {describe, expect, it} from 'nuclide-jest/globals';

// This value functions as the $USER environment variable.
const DEFAULT_USERNAME = 'frederick';
// This value functions as the $HOME environment variable.
const LOCAL_HOME_DIR = `/home/${DEFAULT_USERNAME}`;

describe('parse', () => {
  // Returns the expected IConnectionProfile that results when no properties
  // are specified on the ConnectionProfileConfiguration. This facilitates
  // testing individual overrides.
  function createDefaultExpectedValue() {
    return {
      hostname: 'localhost',
      address: 'localhost',
      ports: '0',
      folders: ['~'],
      deployServer: {
        node: 'node',
        installationPath: `/home/${DEFAULT_USERNAME}/.big-dig/big-dig-vscode`,
        extractFileCommand: undefined,
        autoUpdate: true,
      },
      username: DEFAULT_USERNAME,
      authMethod: 'password',
      privateKey: `${LOCAL_HOME_DIR}/.ssh/id_rsa`,
    };
  }

  it('empty config', async () => {
    const rawProfile = {};
    const expected = createDefaultExpectedValue();
    await test(rawProfile, expected);
  });

  it('empty folders are preserved', async () => {
    const rawProfile = {folders: []};
    const defaultExpected = createDefaultExpectedValue();
    const overrides = {
      folders: [],
    };
    const expected = {...defaultExpected, ...overrides};
    await test(rawProfile, expected);
  });

  it('address inherits hostname', async () => {
    const rawProfile = {
      hostname: 'foobar',
    };
    const defaultExpected = createDefaultExpectedValue();
    const overrides = {
      address: 'foobar',
      hostname: 'foobar',
    };
    const expected = {...defaultExpected, ...overrides};
    await test(rawProfile, expected);
  });

  it('address set independently of hostname', async () => {
    const rawProfile = {
      address: 'foobar',
    };
    const defaultExpected = createDefaultExpectedValue();
    const overrides = {
      address: 'foobar',
    };
    const expected = {...defaultExpected, ...overrides};
    await test(rawProfile, expected);
  });

  it('first port in range is used', async () => {
    const rawProfile = {
      ports: '8080-8083, 9000',
    };
    const defaultExpected = createDefaultExpectedValue();
    const overrides = {
      ports: '8080-8083, 9000',
    };
    const expected = {...defaultExpected, ...overrides};
    await test(rawProfile, expected);
  });

  it('overriding username affects other defaults', async () => {
    const rawProfile = {
      username: 'fred',
    };
    const defaultExpected = createDefaultExpectedValue();
    const {deployServer} = defaultExpected;
    const installationPath = '/home/fred/.big-dig/big-dig-vscode';
    const overrides = {
      username: 'fred',
      deployServer: {...deployServer, installationPath},
    };
    const expected = {...defaultExpected, ...overrides};
    await test(rawProfile, expected);
  });

  it('~ is expanded for privateKey', async () => {
    const rawProfile = {
      privateKey: '~/some_dir/id_rsa',
    };
    const defaultExpected = createDefaultExpectedValue();
    const overrides = {
      privateKey: `${LOCAL_HOME_DIR}/some_dir/id_rsa`,
    };
    const expected = {...defaultExpected, ...overrides};
    await test(rawProfile, expected);
  });

  it('authentication can be overridden', async () => {
    const rawProfile = {
      authentication: 'private-key',
    };
    const defaultExpected = createDefaultExpectedValue();
    const overrides = {
      authMethod: 'private-key',
    };
    const expected = {...defaultExpected, ...overrides};
    await test(rawProfile, expected);
  });
});

/**
 * expectedNormalizedProfile is an IConnectionProfile except that its privateKey
 * property should be resolved instead of a Promise.
 */
async function test(
  rawProfile: ConnectionProfileConfiguration,
  expectedNormalizedProfile: Object,
) {
  const parser = new ProfileConfigurationParser(
    rawProfile,
    DEFAULT_USERNAME,
    LOCAL_HOME_DIR,
  );
  const normalizedProfile = parser.parse();
  const authMethod = await normalizedProfile.authMethod;
  const privateKey = await normalizedProfile.privateKey;
  const resolvedProfile = {...normalizedProfile, authMethod, privateKey};
  expect(resolvedProfile).toEqual(expectedNormalizedProfile);
}
