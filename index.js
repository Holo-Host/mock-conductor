const WebSocket = require('ws')
const msgpack = require('@msgpack/msgpack')

const wss = new WebSocket.Server({ port: 8888 })

const APP_INFO_TYPE = 'app_info'
const ZOME_CALL_TYPE = 'zome_call_invocation'

const holoHashB64 = 'hC0katgCEp09sB8vWFyxeE962bOrpGa4BUyfrHt3tiQkvlW7FX11'
const agentKeyB64 = 'hCAkwBMB+YPIBQTIQ09ty1HU3ppzLOpU9JYr5lyPflNsjvKjAFr7'

const cellId = [
  Buffer.from(holoHashB64, 'base64'),
  Buffer.from(agentKeyB64, 'base64')
]

const responseQueues = {
  [APP_INFO_TYPE]: [],
  [ZOME_CALL_TYPE]: []
}

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    const decoded = msgpack.decode(message)
    const { id } = decoded
    const request = msgpack.decode(decoded.data)
    const { type, data } = request

    if (type === APP_INFO_TYPE) {
  
      const { app_id } = data

      const responseData = msgpack.encode({
        type: APP_INFO_TYPE,
        data: {
          app_id,
          cell_data: [[cellId, 'holo-hosting-app.dna.gz']]
        }  
      })

      const response = {
        type: 'Response',
        id,
        data: responseData
      }

      ws.send(msgpack.encode(response))

    } else if (type === ZOME_CALL_TYPE) {

      const responseData = msgpack.encode({
        type: ZOME_CALL_TYPE,
        data: msgpack.encode([
          {
            happ_id: 1,
            happ_name: 'Happ 1'
          },
          {
            happ_id: 2,
            happ_name: 'Happ 2'
          },
        ])
      })

      const response = {
        type: 'Response',
        id,
        data: responseData
      }

      ws.send(msgpack.encode(response))
    } else {
      throw new Error(`Unknown request type: ${request.type}`)
    }
  });

})