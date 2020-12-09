const { AppWebsocket, AdminWebsocket } = require('@holochain/conductor-api')
const MockHolochainConductor = require('../src/conductor')
const { APP_INFO_TYPE, ZOME_CALL_TYPE, INSTALL_APP_TYPE, GENERATE_AGENT_PUB_KEY_TYPE } = MockHolochainConductor
const PORT = 8888
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

  it('returns the all response if provided', async () => {
    const expectedResponse1 = {
      field1: 'valuea'
    }

    mockHolochainConductor.all(expectedResponse1)

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

    mockHolochainConductor.once(INSTALL_APP_TYPE, installAppData, unExpectedResponse)
    mockHolochainConductor.next(expectedResponse)

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

    mockHolochainConductor.once(INSTALL_APP_TYPE, installAppData, unExpectedResponse)
    mockHolochainConductor.next(unExpectedResponse2)
    mockHolochainConductor.all(expectedResponse)

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    const installAppResult = await adminWebsocket.installApp(installAppData)

    expect(installAppResult).toEqual(expectedResponse)
  })

  it('throws an error when given an unknown type', async () => {
    const type = 'some wrong type'

    expect(() => mockHolochainConductor.once(type, {}, {}))
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

    mockHolochainConductor.once(INSTALL_APP_TYPE, installAppData, unExpectedResponse)

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    let errorMessage

    try {
      await adminWebsocket.generateAgentPubKey()
    } catch (e) {
      errorMessage = e.message
    }

    console.log('errorMessage', errorMessage)

    expect(errorMessage).toMatch(`No more responses for: ${GENERATE_AGENT_PUB_KEY_TYPE}:{}`)
  })

  it.skip('clearResponses removes all saved responses', async () => {
    const installAppData = {
      agent_key: 'agentKey',
      app_id: 'test-app'
    }

    const unUsedResponse = { 
      app_id: 1 
    }

    mockHolochainConductor.once(INSTALL_APP_TYPE, installAppData, unUsedResponse)
    mockHolochainConductor.next(unUsedResponse)
    mockHolochainConductor.all(unUsedResponse)

    mockHolochainConductor.clearResponses()

    const adminWebsocket = await AdminWebsocket.connect(socketPath)

    let errorMessage

    try {
      await adminWebsocket.generateAgentPubKey()
    } catch (e) {
      errorMessage = e.message
    }

    console.log('errorMessage', errorMessage)

    expect(errorMessage).toMatch(`No more responses for: ${GENERATE_AGENT_PUB_KEY_TYPE}:{}`)

  })
})
