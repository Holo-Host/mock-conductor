const { AppWebsocket, AdminWebsocket } = require('@holochain/conductor-api')
const wait = require('waait')
const MockHolochainServer = require('../src/server')
const { APP_INFO_TYPE, ZOME_CALL_TYPE, INSTALL_APP_TYPE, GENERATE_AGENT_PUB_KEY_TYPE } = MockHolochainServer

const PORT = 8888
const socketPath = `ws://localhost:${PORT}`

describe('server', () => {
  var mockHolochainServer

  beforeAll(() => {
    mockHolochainServer = new MockHolochainServer(PORT)
  })

  afterEach(() => {
    mockHolochainServer.clearResponses()
  })

  afterAll(() => {
    mockHolochainServer.close()
  })

  it('returns the all response if provided', async () => {
    const expectedResponse1 = {
      field1: 'valuea'
    }

    mockHolochainServer.all(expectedResponse1)

    const appWebsocket = await AppWebsocket.connect(socketPath)

    const response1 = await appWebsocket.appInfo({})

    expect(response1).toEqual(expectedResponse1)
  })

  it('returns two responses in the order provided to next', async () => {
    const expectedResponse1 = {
      field1: 'valuea'
    }

    const expectedResponse2 = {
      field2: 'valueb'
    }

    mockHolochainServer.next(expectedResponse1)
    mockHolochainServer.next(expectedResponse2)

    const appWebsocket = await AppWebsocket.connect(socketPath)

    const response1 = await appWebsocket.appInfo({})
    const response2 = await appWebsocket.appInfo({})

    expect(response1).toEqual(expectedResponse1)
    expect(response2).toEqual(expectedResponse2)
  })

  it('returns the given response to an appInfo call', async () => {
    const mockedCellId = [
      'hash', 'agentKey'
    ]

    const appId = 'test-app'  

    const appInfoData = { app_id: appId }
    
    const expectedResponse = { cell_data: [[mockedCellId]] }

    mockHolochainServer.once(APP_INFO_TYPE, appInfoData, expectedResponse)

    const appWebsocket = await AppWebsocket.connect(socketPath)

    const appInfo = await appWebsocket.appInfo({ app_id: appId })

    expect(appInfo.cell_data[0][0]).toEqual(mockedCellId)
  })

  it('returns the given response to zome call', async () => {
    const mockedCellId = [
      'hash', 'agentKey'
    ]

    const callZomeData = {
      cell_id: mockedCellId,
      zome_name: 'somezome',
      fn_name: 'somefn',
      provenance: mockedCellId[1],
      payload: null
    }

    const expectedResponse = {
      field1: 'value1',
      field2: 'value2'
    }

    mockHolochainServer.once(ZOME_CALL_TYPE, callZomeData, expectedResponse)


    const appWebsocket = await AppWebsocket.connect(socketPath)

    const callZomeResult = await appWebsocket.callZome(callZomeData)

    expect(callZomeResult).toEqual(expectedResponse)
  })

  it('returns the given response to an installApp call', async () => {
    const mockedCellId = [
      'hash', 'agentKey'
    ]

    const appId = 'test-app'

    const installAppData = {
      agent_key: mockedCellId[1],
      app_id: appId  
    }

    const expectedResponse = { 
      app_id: appId, cell_data: [ [ [mockedCellId], 'dna1' ] ] 
    }

    mockHolochainServer.once(INSTALL_APP_TYPE, installAppData, expectedResponse)

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    const installAppResult = await adminWebsocket.installApp(installAppData)

    expect(installAppResult).toEqual(expectedResponse)
  })

  it('calls a closure when passed one as a response', async () => {
    const mockedCellId = [
      'hash', 'agentKey'
    ]

    const appId = 'test-app'

    const installAppData = {
      agent_key: mockedCellId[1],
      app_id: appId  
    }

    const responseClosure = ({ type, data }) => ({ 
      app_id: data.app_id + '-modified',
      type
    })

    const expectedResponse = {
      app_id: appId + '-modified',
      type: INSTALL_APP_TYPE
    }

    mockHolochainServer.once(INSTALL_APP_TYPE, installAppData, responseClosure)

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    const installAppResult = await adminWebsocket.installApp(installAppData)

    expect(installAppResult).toEqual(expectedResponse)
  })

  it('prioritizes `next` over `once` responses', async () => {
    const appId = 'test-app'

    const installAppData = {
      agent_key: 'agentKey',
      app_id: appId  
    }

    const expectedResponse = { 
      app_id: 1 
    }

    const unExpectedResponse = { 
      app_id: 2
    }

    mockHolochainServer.once(INSTALL_APP_TYPE, installAppData, unExpectedResponse)
    mockHolochainServer.next(expectedResponse)

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    const installAppResult = await adminWebsocket.installApp(installAppData)

    expect(installAppResult).toEqual(expectedResponse)
  })

  it('prioritizes `all` over `next` and `once` responses', async () => {
    const appId = 'test-app'

    const installAppData = {
      agent_key: 'agentKey',
      app_id: appId  
    }

    const unExpectedResponse = { 
      app_id: 1 
    }

    const unExpectedResponse2 = { 
      app_id: 2
    }

    const expectedResponse = {
      app_id: 3
    }

    mockHolochainServer.once(INSTALL_APP_TYPE, installAppData, unExpectedResponse)
    mockHolochainServer.next(unExpectedResponse2)
    mockHolochainServer.all(expectedResponse)

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    const installAppResult = await adminWebsocket.installApp(installAppData)

    expect(installAppResult).toEqual(expectedResponse)
  })

  it('throws an error when given an unknown type', async () => {
    const type = 'some wrong type'

    expect(() => mockHolochainServer.once(type, {}, {}))
      .toThrow(`Unknown request type: ${type}`)
  })

  it.skip('throws an error when there are no matching responses', async () => {
    const installAppData = {
      agent_key: 'agentKey',
      app_id: 'test-app'
    }

    const unExpectedResponse = { 
      app_id: 1 
    }

    mockHolochainServer.once(INSTALL_APP_TYPE, installAppData, unExpectedResponse)

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    try {
      await adminWebsocket.generateAgentPubKey()
    } catch (e) {
      expect(e).toMatch(`No more responses for: ${GENERATE_AGENT_PUB_KEY_TYPE}:{}`)
    }
  })

  it('clearResponses removes all saved responses', async () => {
  })
})
