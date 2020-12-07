# Mock Holochain Server README.md


Javascript library for mocking the [Holochain](https://github.com/holochain/holochain) conductor. Version mumber matches corresponds with version number of the [Holochain conductor api library](https://github.com/holochain/holochain-conductor-api).

## Overview
This module is primarily for testing code that calls the holochain conductor trhough the holochain conductor api.

### Instalation

`npm install @holochain/mock-holochain-server --save-dev`

or

`yarn add @holochain/mock-holochain-server --dev`

### Basic Usage
`.next` will add a response to the end of the generic response queue. While there are responses in the generic response queue, each call will return the next response in the queue.

```javascript=
const MockHolochainServer = require('@holochain/mock-holochain-server')
const { AdminWebsocket } = require('@holochain/conductor-api')
const PORT = 8888

// inside a test framework
(async () => {
  const mockHolochainServer = new MockHolochainServer(PORT)
  const expectedResponse = {
    field1: 'value1',
    field2: 'value2'    
  }
  mockHolochainServer.next(expectedResponse)
  
  const adminWebsocket = await AppWebsocket.connect(socketPath)
  const response = await adminWebsocket.installApp({})
  expect(response).toEqual(expectedResponse)
})()

```

### Creating responses for specific calls
`.once` adds a response to a specific queue, specified by the call type and call data. You will only get this response if you make a call with the same arguments **and** the generic queue (see above)is empty.

```javascript=
const MockHolochainServer = require('@holochain/mock-holochain-server')
const { INSTALL_APP_TYPE } = MockHolochainServer
const { AdminWebsocket } = require('@holochain/conductor-api')
const PORT = 8888

// inside a test framework
(async () => {
  const mockHolochainServer = new MockHolochainServer(PORT)
  const expectedResponse = {
    field1: 'value1',
    field2: 'value2'    
  }
  
  const installAppData = {
    agent_key: 'someagentkey',
    app_id: 'someappid'
  }
  
  mockHolochainServer.once(INSTALL_APP_TYPE, installAppData, expectedResponse)
  
  const adminWebsocket = await AppWebsocket.connect(socketPath)
  const response = await adminWebsocket.installApp(installAppData)
  expect(response).toEqual(expectedResponse)
})()

```