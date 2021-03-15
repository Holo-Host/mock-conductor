const WebSocket = require('ws')
const msgpack = require('@msgpack/msgpack')
const _ = require('lodash')

function generateResponseKey (type, data) {
  return `${type}:${JSON.stringify(_.omit(data, ['payload', 'provenance', 'args', 'cap']))}`
}

// these constants can be found in holochain-conductor-api
// AppWebsocket
const APP_INFO_TYPE = 'app_info'
const ZOME_CALL_TYPE = 'zome_call_invocation'
// AdminWebsocket
const ACTIVATE_APP_TYPE = 'activate_app'
const ATTACH_APP_INTERFACE_TYPE = 'attach_app_interface'
const DEACTIVATE_APP_TYPE = 'deactivate_app'
const DUMP_TYPE = 'dump_state'
const GENERATE_AGENT_PUB_KEY_TYPE = 'generate_agent_pub_key'
const INSTALL_APP_TYPE = 'install_app'
const LIST_DNAS_TYPE = 'list_dnas'
const LIST_CELL_IDS_TYPE = 'list_cell_ids'
const LIST_ACTIVE_APP_IDS_TYPE = 'list_active_app_ids'
// Error
const ERROR_TYPE = 'error'

// next type is used internally for the next queue
const NEXT_TYPE = 'next'

const REQUEST_TYPES = [
  APP_INFO_TYPE, ZOME_CALL_TYPE, ACTIVATE_APP_TYPE, ATTACH_APP_INTERFACE_TYPE, DEACTIVATE_APP_TYPE, DUMP_TYPE, 
  GENERATE_AGENT_PUB_KEY_TYPE, INSTALL_APP_TYPE, LIST_DNAS_TYPE, LIST_CELL_IDS_TYPE, LIST_ACTIVE_APP_IDS_TYPE, NEXT_TYPE
]

const NEXT_RESPONSE_KEY = generateResponseKey(NEXT_TYPE, {})

class MockHolochainConductor {
  constructor(adminPort, ...ports) {
    this.adminPort = adminPort
    this.ports = ports
    this.clearResponses()

    this.appWssList = []
    ports.forEach(port => this.addPort(port))

    if (adminPort) {
      this.adminWss = new WebSocket.Server({ port: adminPort })
      this.adminWss.on('connection', ws => {
        ws.on('message', message => {
          // We could be much cleverer about handling admin calls and simulate installing and attaching apps etc. For now we're keeping it simple.
          this.handleHCRequest(message, ws)
        })
      })
    }
  }

  addPort (port) {
    const appWss = new WebSocket.Server({ port, clientTracking: true })

    this.appWssList.push(appWss)

    appWss.on('connection', ws => {
      ws.on('message', message => {
        this.handleHCRequest(message, ws)
      })
    })
  }

  any (response, returnError = false) {
    this.anyResponse = {returnError, response}
  }

  next (response, returnError = false) {
    this.once(NEXT_TYPE, {}, response, returnError)
  }

  once (type, data, response, returnError = false) {
    if (!REQUEST_TYPES.includes(type)) {
      throw new Error (`Unknown request type: ${type}`)
    }
  
    const responseKey = generateResponseKey(type, data)

    if (!this.responseQueues[responseKey]) {
      this.responseQueues[responseKey] = []
    }
  
    this.responseQueues[responseKey].push({returnError, response})
  }

  clearResponses () {
    this.responseQueues = {}
    this.anyResponse = null
  }

  async close () {
    const promises = [this.closeApps()]
    if (this.adminWss) {
      promises.push(new Promise(resolve => this.adminWss.close(resolve)))
    }
    await Promise.all(promises)
  }

  async closeApps () {
    if (this.appWssList) {
      await Promise.all(this.appWssList.map(appWss => new Promise(resolve => appWss.close(resolve))))
      this.appWssList = []
    }
  }

  getSavedResponse (type, data) {
    let responseKey

    // if there are responses in the 'next' queue, we use those and ignore the specific type and data of the request
    if (!_.isEmpty(this.responseQueues[NEXT_RESPONSE_KEY])) {
      responseKey = NEXT_RESPONSE_KEY
    } else {
      responseKey = generateResponseKey(type, data)
    }

    if (!this.responseQueues[responseKey]) {
      if (this.anyResponse) return this.anyResponse

      throw new Error(`No more responses for: ${responseKey}`)
    }

    return this.responseQueues[responseKey].shift()
  }

  handleHCRequest (message, ws) {
    const decoded = msgpack.decode(message)
    const { id } = decoded
    const request = msgpack.decode(decoded.data)
    const { type, data } = request 
    
    let responseOrResponseFunc
    let returnError

    try {
      const { returnError: returnError2, response: responseOrResponseFunc2 } = this.getSavedResponse(type, data)
      returnError = returnError2
      responseOrResponseFunc = responseOrResponseFunc2
    } catch (e) {
      responseOrResponseFunc = e.message
      returnError = true

    }

    let responsePayload = _.isFunction(responseOrResponseFunc) ? responseOrResponseFunc(request) : responseOrResponseFunc
  
    if (type === ZOME_CALL_TYPE) {
      // there's an extra layer of encoding in the zome call responses
      responsePayload = msgpack.encode(responsePayload)
    }
    
    const responseData = msgpack.encode({
      type: returnError ? ERROR_TYPE : type,
      data: responsePayload
    })  
  
  
    const response = {
      type: 'Response',
      id,
      data: responseData
    }
  
    ws.send(msgpack.encode(response))
  }

  async broadcastAppSignal (cellId, signalData) {
    const message = msgpack.encode({
      type: 'Signal',
      data: msgpack.encode({
        App: [cellId, msgpack.encode(signalData)]
      })
    })

    if (this.appWssList.length === 0) {
      throw new Error("broadcastAppSignal called with no app interfaces attached")
    }

    await Promise.all(this.appWssList.map(
      appWss => Promise.all(Array.from(appWss.clients.keys(),
        appWs => new Promise(resolve => appWs.send(message, undefined, resolve))))))
  }
}

module.exports = MockHolochainConductor
module.exports.APP_INFO_TYPE = APP_INFO_TYPE
module.exports.ZOME_CALL_TYPE = ZOME_CALL_TYPE
module.exports.ACTIVATE_APP_TYPE = ACTIVATE_APP_TYPE
module.exports.ATTACH_APP_INTERFACE_TYPE = ATTACH_APP_INTERFACE_TYPE
module.exports.DEACTIVATE_APP_TYPE = DEACTIVATE_APP_TYPE
module.exports.DUMP_TYPE = DUMP_TYPE
module.exports.GENERATE_AGENT_PUB_KEY_TYPE = GENERATE_AGENT_PUB_KEY_TYPE
module.exports.INSTALL_APP_TYPE = INSTALL_APP_TYPE
module.exports.LIST_DNAS_TYPE = LIST_DNAS_TYPE
module.exports.LIST_CELL_IDS_TYPE = LIST_CELL_IDS_TYPE
module.exports.LIST_ACTIVE_APP_IDS_TYPE = LIST_ACTIVE_APP_IDS_TYPE
module.exports.ERROR_TYPE = ERROR_TYPE
