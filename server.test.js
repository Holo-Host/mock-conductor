const childProcess = require('child_process')
const { AppWebsocket } = require('@holochain/conductor-api')
const WebSocket = require('ws')
const wait = require('waait')

const PORT = 8888

describe('server', () => {
  var ws

  beforeAll(async () => {
    childProcess.exec(`"${__dirname}/server.js" ${PORT}`);
    await wait(2000)
    ws = new WebSocket(`ws://localhost:${PORT}`)
  })

  afterAll(async () => {
    childProcess.exec(`"${__dirname}/server.js" ${PORT}`);
    await wait(2000)
    ws.send(JSON.stringify({ cmd: 'shutdown_server' }))
  })

  it('responds to an appInfo call', async () => {
    const mockedCellId = [
      'hash', 'agentKey'
    ]

    const appInfoMock = JSON.stringify({
      type: 'add_response',
      requestType: 'app_info',
      data: {
        app_id: 'test-app'
      },
      response: {
        cell_data: [[mockedCellId]]
      }
    })
  
    const result = await ws.send(appInfoMock)

    console.log('result', result)
  })
})
