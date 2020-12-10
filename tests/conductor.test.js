const { AppWebsocket, AdminWebsocket } = require('@holochain/conductor-api')
const MockHolochainConductor = require('../src/index')
const { APP_INFO_TYPE, ZOME_CALL_TYPE, INSTALL_APP_TYPE, GENERATE_AGENT_PUB_KEY_TYPE, ERROR_TYPE } = MockHolochainConductor
const PORT = 6422
const socketPath = `ws://localhost:${PORT}`

describe('MockHolochainConductor', () => {
  var mockHolochainConductor

  beforeAll(() => {
    mockHolochainConductor = new MockHolochainConductor(PORT)
  })

  afterEach(() => {
    mockHolochainConductor.clearResponses()
  })

  afterAll(() => {
    mockHolochainConductor.close()
  })

  it('returns the any response if provided', async () => {
    const expectedResponse1 = {
      field1: 'valuea'
    }

    mockHolochainConductor.any(expectedResponse1)

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

    mockHolochainConductor.next(expectedResponse1)
    mockHolochainConductor.next(expectedResponse2)

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

    mockHolochainConductor.once(APP_INFO_TYPE, appInfoData, expectedResponse)

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

    mockHolochainConductor.once(ZOME_CALL_TYPE, callZomeData, expectedResponse)


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

    mockHolochainConductor.once(INSTALL_APP_TYPE, installAppData, expectedResponse)

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

    mockHolochainConductor.once(INSTALL_APP_TYPE, installAppData, responseClosure)

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    const installAppResult = await adminWebsocket.installApp(installAppData)

    expect(installAppResult).toEqual(expectedResponse)
  })

  it('prioritizes `once` over `any` responses', async () => {
    const appId = 'test-app'

    const installAppData = {
      agent_key: 'agentKey',
      app_id: appId  
    }

    const expectedOnceResponse = { 
      app_id: 1 
    }

    const expectedAnyResponse = { 
      app_id: 2 
    }

    mockHolochainConductor.once(INSTALL_APP_TYPE, installAppData, expectedOnceResponse)
    mockHolochainConductor.any(expectedAnyResponse)

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    const installAppResult = await adminWebsocket.installApp(installAppData)

    expect(installAppResult).toEqual(expectedOnceResponse)

    const generateAgentPubKeyResult =  await adminWebsocket.generateAgentPubKey()
    expect(generateAgentPubKeyResult).toEqual(expectedAnyResponse)    
  })

  it('prioritizes `next` over `once` and `any` responses', async () => {
    const appId = 'test-app'

    const installAppData = {
      agent_key: 'agentKey',
      app_id: appId  
    }

    const unExpectedOnceResponse = { 
      app_id: 1 
    }

    const unExpectedAnyResponse = { 
      app_id: 2
    }

    const expectedResponse = {
      app_id: 3
    }

    mockHolochainConductor.next(expectedResponse)
    mockHolochainConductor.once(INSTALL_APP_TYPE, installAppData, unExpectedOnceResponse)
    mockHolochainConductor.any(unExpectedAnyResponse)

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    const installAppResult = await adminWebsocket.installApp(installAppData)

    expect(installAppResult).toEqual(expectedResponse)
  })

  it('throws an error when given an unknown type', async () => {
    const type = 'some wrong type'

    expect(() => mockHolochainConductor.once(type, {}, {}))
      .toThrow(`Unknown request type: ${type}`)
  })

  it('throws an error when there are no matching responses', async () => {
    const installAppData = {
      agent_key: 'agentKey',
      app_id: 'test-app'
    }

    const unExpectedResponse = { 
      app_id: 1 
    }

    mockHolochainConductor.once(INSTALL_APP_TYPE, installAppData, unExpectedResponse)

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    const result = await adminWebsocket.generateAgentPubKey()

    expect(result).toEqual({
      type: ERROR_TYPE,
      message: `No more responses for: ${GENERATE_AGENT_PUB_KEY_TYPE}:{}`
    })
  })

  it('clearResponses removes all saved responses', async () => {
    const installAppData = {
      agent_key: 'agentKey',
      app_id: 'test-app'
    }

    const unUsedResponse = { 
      app_id: 1 
    }

    mockHolochainConductor.once(INSTALL_APP_TYPE, installAppData, unUsedResponse)
    mockHolochainConductor.next(unUsedResponse)
    mockHolochainConductor.any(unUsedResponse)

    mockHolochainConductor.clearResponses()

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    const result = await adminWebsocket.generateAgentPubKey()

    expect(result).toEqual({
      type: ERROR_TYPE,
      message: `No more responses for: ${GENERATE_AGENT_PUB_KEY_TYPE}:{}`
    })
  })

  it('addPort adds a new port', async () => {
    const newPort = PORT + 1
    const newSocketPath = `ws://localhost:${newPort}`

    const expectedResponse = {
      app_id: 1 
    }

    mockHolochainConductor.any(expectedResponse)

    let errorMessage
    try {
      await AdminWebsocket.connect(newSocketPath)
    } catch (e) {
      errorMessage = e.message
    }

    expect(errorMessage).toEqual(`could not connect to holochain conductor, please check that a conductor service is running and available at ws://localhost:${newPort}`)

    mockHolochainConductor.addPort(newPort)

    const adminWebsocket = await AdminWebsocket.connect(newSocketPath)

    const result = await adminWebsocket.generateAgentPubKey()

    expect(result).toEqual(expectedResponse)
  })
})
