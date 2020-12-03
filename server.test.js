const childProcess = require('child_process')
const { AppWebsocket } = require('@holochain/conductor-api')
const WebSocket = require('ws')
const wait = require('waait')

const PORT = 8888
const socketPath = `ws://localhost:${PORT}`

describe('server', () => {
  var ws, serverProcess

  beforeAll(async () => {
    serverProcess = childProcess.fork(`${__dirname}/server.js`, [PORT])
    await wait (2000)
  })

  beforeEach(() => {
    ws = new WebSocket(socketPath)
  })

  afterEach(() => {
    ws.terminate()
  })

  afterAll(async () => {
    serverProcess.kill()
  })

  it('returns the given response to an appInfo call', async () => {
    const mockedCellId = [
      'hash', 'agentKey'
    ]

    const appId = 'test-app'

    const appInfoMock = JSON.stringify({
      cmd: 'add_response',
      requestType: 'app_info',
      data: {
        app_id: appId
      },
      response: {
        cell_data: [[mockedCellId]]
      }
    })
  
    ws.on('open', async () => {
      ws.send(appInfoMock)
    })

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

    const callZomeMock = JSON.stringify({
      cmd: 'add_response',
      requestType: 'zome_call_invocation',
      data: callZomeData,
      response: expectedResponse
    })
  
    ws.on('open', async () => {
      ws.send(callZomeMock)
    })

    const appWebsocket = await AppWebsocket.connect(socketPath)

    const callZomeResult = await appWebsocket.callZome(callZomeData)

    expect(callZomeResult).toEqual(expectedResponse)
  })
})
