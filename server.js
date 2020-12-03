const WebSocket = require('ws')
const msgpack = require('@msgpack/msgpack')
const _ = require('lodash')

function generateResponseKey (type, data) {
  return `${type}:${JSON.stringify(_.omit(data, 'payload'))}`
}

const APP_INFO_TYPE = 'app_info'
const ZOME_CALL_TYPE = 'zome_call_invocation'

class MockHolochainServer {
  constructor(appPort, adminPort) {
    this.appPort = appPort
    this.adminPort = adminPort
    this.responseQueues = {}

    this.wss = new WebSocket.Server({ port: appPort })

    // these have to be arrow functions to avoid rebind 'this'
    this.wss.on('connection', ws => {
      ws.on('message', message => {
        this.handleHCRequest(message, ws)
      })
    })
  }

  once (type, data, response) {
    if (![APP_INFO_TYPE, ZOME_CALL_TYPE].includes(type)) {
      throw new Error (`Unknown request type: ${type}`)
    }
  
    const responseKey = generateResponseKey(type, data)

    if (!this.responseQueues[responseKey]) {
      this.responseQueues[responseKey] = []
    }
  
    this.responseQueues[responseKey].push(response)  
  }

  clearResponses () {
    this.responseQueues = {}
  }

  close () {
    this.wss.close()
  }

  handleHCRequest (message, ws) {
    const decoded = msgpack.decode(message)
    const { id } = decoded
    const request = msgpack.decode(decoded.data)
    const { type, data } = request 
  
    const responseKey = generateResponseKey(type, data)
  
    if (!this.responseQueues[responseKey]) {
      throw new Error(`No more responses for: ${responseKey}`)
    }
  
    var responsePayload = this.responseQueues[responseKey].pop()
  
    if (type === ZOME_CALL_TYPE) {
      // there's an extra layer of encoding in the zome call responses
      responsePayload = msgpack.encode(responsePayload)
    }
    
    const responseData = msgpack.encode({
      type,
      data: responsePayload
    })  
  
  
    const response = {
      type: 'Response',
      id,
      data: responseData
    }
  
    ws.send(msgpack.encode(response))
  }

}

module.exports = MockHolochainServer
module.exports.APP_INFO_TYPE = APP_INFO_TYPE
module.exports.ZOME_CALL_TYPE = ZOME_CALL_TYPE