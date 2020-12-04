const { AppWebsocket, AdminWebsocket } = require('@holochain/conductor-api')
const wait = require('waait')
const MockHolochainServer = require('./server')
const { APP_INFO_TYPE, ZOME_CALL_TYPE, INSTALL_APP_TYPE } = MockHolochainServer

const PORT = 8888
const socketPath = `ws://localhost:${PORT}`

describe('server', () => {
  var mockHolochainServer

  beforeAll(async () => {
    mockHolochainServer = new MockHolochainServer(PORT)
    await wait (2000)
  })

  afterAll(async () => {
    mockHolochainServer.close()
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
})
