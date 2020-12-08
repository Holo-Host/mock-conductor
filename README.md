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

```javascript
const MockHolochainServer = require('@holochain/mock-holochain-server')
const { AdminWebsocket } = require('@holochain/conductor-api')
const PORT = 8888

// inside a test framework
(async () => {
  const mockHolochainServer = new MockHolochainServer(null, PORT)
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

```javascript
const MockHolochainServer = require('@holochain/mock-holochain-server')
const { INSTALL_APP_TYPE } = MockHolochainServer
const { AdminWebsocket } = require('@holochain/conductor-api')
const PORT = 8888

// inside a test framework
(async () => {
  const mockHolochainServer = new MockHolochainServer(null, PORT)
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

### Creating a constant response for all calls
`.all` adds a response that will be returned by all future calls.

```javascript
const MockHolochainServer = require('@holochain/mock-holochain-server')
const { INSTALL_APP_TYPE } = MockHolochainServer
const { AdminWebsocket } = require('@holochain/conductor-api')
const PORT = 8888

// inside a test framework
(async () => {
  const mockHolochainServer = new MockHolochainServer(null, PORT)
  const expectedResponse = {
    field1: 'value1',
    field2: 'value2'    
  }
  
  const installAppData = {
    agent_key: 'someagentkey',
    app_id: 'someappid'
  }
  
  mockHolochainServer.all(INSTALL_APP_TYPE, installAppData, expectedResponse)
  
  const adminWebsocket = await AppWebsocket.connect(socketPath)
  const response = await adminWebsocket.installApp(installAppData)
  expect(response).toEqual(expectedResponse)
})()

```

### Calling a closure to dynamically generate a response
`.all`, `.next` and `.once` can all take a closure as their `response` param instead of a static value. This closure is passed the type and data from the request.

```javascript
const MockHolochainServer = require('@holochain/mock-holochain-server')
const { INSTALL_APP_TYPE } = MockHolochainServer
const { AdminWebsocket } = require('@holochain/conductor-api')
const PORT = 8888

// inside a test framework
(async () => {
  const mockHolochainServer = new MockHolochainServer(null, PORT)

  const responseClosure = ({ type, data }) => ({ 
    app_id: data.app_id + '-modified',
    type
  })

  const installAppData = {
    agent_key: 'someagentkey',
    app_id: 'someappid'
  }


  const expectedResponse = {
    app_id: installAppData.app_id + '-modified'
    type: 'install_app'
  }
    
  mockHolochainServer.all(INSTALL_APP_TYPE, installAppData, responseClosure)
  
  const adminWebsocket = await AppWebsocket.connect(socketPath)
  const response = await adminWebsocket.installApp(installAppData)
  expect(response).toEqual(expectedResponse)
})()

```

## API

### new MockHolochainConductor(appPort, adminPort)
Returns a MockHolochainConductor instance listening on the provided ports. Pass null if you don't need the port.

### .once(type, data, response)
Adds a response to the response queue corresponding with `type` and `data`. The front response in this queue is returned for any call with the same `type` and `data`. Note, for the purpose of matching, the `payload` and `provenance` fields are stripped out of `data`, so if you want to have different responses depending on those fields you will have to provide a custom closure (see below)

### .next(response)
Adds a response to the next queue. This front response in this queue will be returned the next time any call is made.

### .all(response)
Adds an overriding constant response. This response will be returned any time a call is made.

### .clearResponses()
Clears all queues and the `all` response. 

### .close
Closes all running websocket servers

### Custom closures: ({ type, data }) => {}
`.all`, `.next` and `.once` can all take a closure as their `response` param instead of a static value. This closure is passed the type and data from the request. Payload and provenance are not stripped out of the `data` field here.
